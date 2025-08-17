// Fast compiled DSL patterns for hot paths
import type { Unit } from "../types/Unit";

export class FastDSL {
  // Pre-compiled closest enemy function
  static closestEnemy(unit: Unit, allUnits: readonly Unit[]): Unit | null {
    let closest: Unit | null = null;
    let minDistSq = Infinity;
    
    for (let i = 0; i < allUnits.length; i++) {
      const other = allUnits[i];
      // Skip same team, dead units, and self
      if (other.team === unit.team || other.state === 'dead' || other.id === unit.id) {
        continue;
      }
      
      const dx = other.pos.x - unit.pos.x;
      const dy = other.pos.y - unit.pos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = other;
      }
    }
    
    return closest;
  }
  
  // Pre-compiled closest ally function
  static closestAlly(unit: Unit, allUnits: readonly Unit[]): Unit | null {
    let closest: Unit | null = null;
    let minDistSq = Infinity;
    
    for (let i = 0; i < allUnits.length; i++) {
      const other = allUnits[i];
      // Skip different team, dead units, and self
      if (other.team !== unit.team || other.state === 'dead' || other.id === unit.id) {
        continue;
      }
      
      const dx = other.pos.x - unit.pos.x;
      const dy = other.pos.y - unit.pos.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = other;
      }
    }
    
    return closest;
  }
  
  // Distance check without sqrt
  static withinRange(unit: Unit, target: Unit | null, rangeSq: number): boolean {
    if (!target) return false;
    const dx = target.pos.x - unit.pos.x;
    const dy = target.pos.y - unit.pos.y;
    return (dx * dx + dy * dy) <= rangeSq;
  }
  
  // Pre-compute range squared values
  static rangeSquared(range: number): number {
    return range * range;
  }
}