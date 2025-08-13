/**
 * Centralized target/ally finding cache
 * Computed once per frame during pairwise pass
 */
import { Unit } from "../types/Unit";

export interface TargetData {
  closestEnemy?: string;
  closestEnemyDist: number;
  closestAlly?: string;
  closestAllyDist: number;
  nearbyEnemies: string[];  // Within combat range
  nearbyAllies: string[];    // Within support range
}

export class TargetCache {
  private cache: Map<string, TargetData> = new Map();
  
  clear(): void {
    this.cache.clear();
  }
  
  // Initialize entry for a unit
  initUnit(unitId: string): void {
    this.cache.set(unitId, {
      closestEnemyDist: Infinity,
      closestAllyDist: Infinity,
      nearbyEnemies: [],
      nearbyAllies: []
    });
  }
  
  // Update during pairwise pass
  updatePair(unitA: Unit, unitB: Unit, distSq: number): void {
    const dist = Math.sqrt(distSq);
    
    // Get or create cache entries
    if (!this.cache.has(unitA.id)) this.initUnit(unitA.id);
    if (!this.cache.has(unitB.id)) this.initUnit(unitB.id);
    
    const dataA = this.cache.get(unitA.id)!;
    const dataB = this.cache.get(unitB.id)!;
    
    // Skip dead units
    if (unitA.state === 'dead' || unitB.state === 'dead') return;
    
    // Check if they're enemies or allies
    if (unitA.team !== unitB.team) {
      // A sees B as enemy
      if (dist < dataA.closestEnemyDist) {
        dataA.closestEnemy = unitB.id;
        dataA.closestEnemyDist = dist;
      }
      if (dist <= 2) { // Combat range
        dataA.nearbyEnemies.push(unitB.id);
      }
      
      // B sees A as enemy
      if (dist < dataB.closestEnemyDist) {
        dataB.closestEnemy = unitA.id;
        dataB.closestEnemyDist = dist;
      }
      if (dist <= 2) { // Combat range
        dataB.nearbyEnemies.push(unitA.id);
      }
    } else {
      // Same team - allies
      // A sees B as ally
      if (dist < dataA.closestAllyDist) {
        dataA.closestAlly = unitB.id;
        dataA.closestAllyDist = dist;
      }
      if (dist <= 5) { // Support range
        dataA.nearbyAllies.push(unitB.id);
      }
      
      // B sees A as ally
      if (dist < dataB.closestAllyDist) {
        dataB.closestAlly = unitA.id;
        dataB.closestAllyDist = dist;
      }
      if (dist <= 5) { // Support range
        dataB.nearbyAllies.push(unitA.id);
      }
    }
  }
  
  // Get target data for a unit
  getTargetData(unitId: string): TargetData | undefined {
    return this.cache.get(unitId);
  }
  
  // Get closest enemy for hunt behavior
  getClosestEnemy(unitId: string): string | undefined {
    return this.cache.get(unitId)?.closestEnemy;
  }
  
  // Get closest ally for guard/follow behavior  
  getClosestAlly(unitId: string): string | undefined {
    return this.cache.get(unitId)?.closestAlly;
  }
}