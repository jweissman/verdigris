// Batched spatial query system to avoid repeated O(N²) operations
// Instead of each rule doing its own distance checks, we batch them all and resolve once

import { Unit } from '../types/Unit';
import { Vec2 } from '../types/Vec2';

export interface RadiusQuery {
  id: string;
  center: Vec2;
  radius: number;
  filter?: (unit: Unit) => boolean;
  callback: (units: Unit[]) => void;
}

export interface PositionQuery {
  id: string;
  pos: Vec2;
  excludeUnit?: Unit;
  callback: (occupied: boolean, units: Unit[]) => void;
}

export interface CollisionQuery {
  id: string;
  threshold: number; // Distance threshold for collision
  filter?: (a: Unit, b: Unit) => boolean;
  callback: (pairs: Array<[Unit, Unit]>) => void;
}

export interface AdjacentQuery {
  id: string;
  unit: Unit;
  maxDistance: number;
  filter?: (other: Unit) => boolean;
  callback: (adjacent: Unit[]) => void;
}

export class SpatialQueryBatcher {
  private radiusQueries: RadiusQuery[] = [];
  private positionQueries: PositionQuery[] = [];
  private collisionQueries: CollisionQuery[] = [];
  private adjacentQueries: AdjacentQuery[] = [];
  
  // Cache computed distances to avoid recalculation
  private distanceCache: Map<string, number> = new Map();
  
  // Register queries (called by rules during their apply phase)
  
  queryRadius(center: Vec2, radius: number, callback: (units: Unit[]) => void, filter?: (unit: Unit) => boolean): void {
    this.radiusQueries.push({
      id: `radius_${this.radiusQueries.length}`,
      center,
      radius,
      filter,
      callback
    });
  }
  
  queryPosition(pos: Vec2, callback: (occupied: boolean, units: Unit[]) => void, excludeUnit?: Unit): void {
    this.positionQueries.push({
      id: `pos_${this.positionQueries.length}`,
      pos,
      excludeUnit,
      callback
    });
  }
  
  queryCollisions(threshold: number, callback: (pairs: Array<[Unit, Unit]>) => void, filter?: (a: Unit, b: Unit) => boolean): void {
    this.collisionQueries.push({
      id: `collision_${this.collisionQueries.length}`,
      threshold,
      filter,
      callback
    });
  }
  
  queryAdjacent(unit: Unit, maxDistance: number, callback: (adjacent: Unit[]) => void, filter?: (other: Unit) => boolean): void {
    this.adjacentQueries.push({
      id: `adjacent_${this.adjacentQueries.length}`,
      unit,
      maxDistance,
      filter,
      callback
    });
  }
  
  // Process all queries at once (called once per frame)
  
  processQueries(units: Unit[]): void {
    // Clear distance cache from previous frame
    this.distanceCache.clear();
    
    // Build position map once for position queries
    const positionMap = this.buildPositionMap(units);
    
    // Process position queries first (simplest)
    for (const query of this.positionQueries) {
      const key = `${Math.round(query.pos.x)},${Math.round(query.pos.y)}`;
      const unitsAtPos = positionMap.get(key) || [];
      const filtered = query.excludeUnit 
        ? unitsAtPos.filter(u => u !== query.excludeUnit)
        : unitsAtPos;
      query.callback(filtered.length > 0, filtered);
    }
    
    // Process radius queries
    for (const query of this.radiusQueries) {
      const unitsInRadius: Unit[] = [];
      const radiusSq = query.radius * query.radius;
      
      for (const unit of units) {
        const distSq = this.getDistanceSquared(query.center, unit.pos);
        if (distSq <= radiusSq) {
          if (!query.filter || query.filter(unit)) {
            unitsInRadius.push(unit);
          }
        }
      }
      
      query.callback(unitsInRadius);
    }
    
    // Process collision queries (pairwise)
    for (const query of this.collisionQueries) {
      const pairs: Array<[Unit, Unit]> = [];
      const thresholdSq = query.threshold * query.threshold;
      
      for (let i = 0; i < units.length; i++) {
        for (let j = i + 1; j < units.length; j++) {
          const distSq = this.getDistanceSquaredUnits(units[i], units[j]);
          if (distSq < thresholdSq) {
            if (!query.filter || query.filter(units[i], units[j])) {
              pairs.push([units[i], units[j]]);
            }
          }
        }
      }
      
      query.callback(pairs);
    }
    
    // Process adjacent queries
    for (const query of this.adjacentQueries) {
      const adjacent: Unit[] = [];
      const maxDistSq = query.maxDistance * query.maxDistance;
      
      for (const other of units) {
        if (other === query.unit) continue;
        const distSq = this.getDistanceSquaredUnits(query.unit, other);
        if (distSq <= maxDistSq) {
          if (!query.filter || query.filter(other)) {
            adjacent.push(other);
          }
        }
      }
      
      query.callback(adjacent);
    }
    
    // Clear queries after processing
    this.clearQueries();
  }
  
  clearQueries(): void {
    this.radiusQueries = [];
    this.positionQueries = [];
    this.collisionQueries = [];
    this.adjacentQueries = [];
  }
  
  // Helper methods
  
  private buildPositionMap(units: Unit[]): Map<string, Unit[]> {
    const map = new Map<string, Unit[]>();
    
    for (const unit of units) {
      // Include all positions for huge units
      const positions = this.getUnitPositions(unit);
      for (const pos of positions) {
        const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(unit);
      }
    }
    
    return map;
  }
  
  private getUnitPositions(unit: Unit): Vec2[] {
    if (!unit.meta.huge) return [unit.pos];
    
    // For huge units, include all body positions
    return [
      unit.pos,
      { x: unit.pos.x, y: unit.pos.y + 1 },
      { x: unit.pos.x, y: unit.pos.y + 2 },
      { x: unit.pos.x, y: unit.pos.y + 3 }
    ];
  }
  
  private getDistanceSquared(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
  
  private getDistanceSquaredUnits(a: Unit, b: Unit): number {
    const key = `${a.id}_${b.id}`;
    const reverseKey = `${b.id}_${a.id}`;
    
    // Check cache first
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }
    if (this.distanceCache.has(reverseKey)) {
      return this.distanceCache.get(reverseKey)!;
    }
    
    // Calculate and cache
    const distSq = this.getDistanceSquared(a.pos, b.pos);
    this.distanceCache.set(key, distSq);
    return distSq;
  }
}