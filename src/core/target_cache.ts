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
  nearbyEnemies: string[]; // Within combat range
  nearbyAllies: string[]; // Within support range
}

export class TargetCache {
  private cache: Map<string, TargetData> = new Map();

  clear(): void {
    this.cache.clear();
  }

  initUnit(unitId: string): void {
    this.cache.set(unitId, {
      closestEnemyDist: Infinity,
      closestAllyDist: Infinity,
      nearbyEnemies: [],
      nearbyAllies: [],
    });
  }

  updatePair(unitA: Unit, unitB: Unit, distSq: number): void {
    const dist = Math.sqrt(distSq);

    if (!this.cache.has(unitA.id)) this.initUnit(unitA.id);
    if (!this.cache.has(unitB.id)) this.initUnit(unitB.id);

    const dataA = this.cache.get(unitA.id)!;
    const dataB = this.cache.get(unitB.id)!;

    if (unitA.state === "dead" || unitB.state === "dead") return;

    if (unitA.team !== unitB.team) {
      if (dist < dataA.closestEnemyDist) {
        dataA.closestEnemy = unitB.id;
        dataA.closestEnemyDist = dist;
      }
      if (dist <= 2) {

        dataA.nearbyEnemies.push(unitB.id);
      }

      if (dist < dataB.closestEnemyDist) {
        dataB.closestEnemy = unitA.id;
        dataB.closestEnemyDist = dist;
      }
      if (dist <= 2) {

        dataB.nearbyEnemies.push(unitA.id);
      }
    } else {
      if (dist < dataA.closestAllyDist) {
        dataA.closestAlly = unitB.id;
        dataA.closestAllyDist = dist;
      }
      if (dist <= 5) {

        dataA.nearbyAllies.push(unitB.id);
      }

      if (dist < dataB.closestAllyDist) {
        dataB.closestAlly = unitA.id;
        dataB.closestAllyDist = dist;
      }
      if (dist <= 5) {

        dataB.nearbyAllies.push(unitA.id);
      }
    }
  }

  getTargetData(unitId: string): TargetData | undefined {
    return this.cache.get(unitId);
  }

  getClosestEnemy(unitId: string): string | undefined {
    return this.cache.get(unitId)?.closestEnemy;
  }

  getClosestAlly(unitId: string): string | undefined {
    return this.cache.get(unitId)?.closestAlly;
  }
}
