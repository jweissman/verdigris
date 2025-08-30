/**
 * CollisionCache - Pre-computed spatial relationships for all units
 * Built once per tick, queried by multiple rules
 */
export class CollisionCache {
  private nearbyUnits: Map<number, number[]> = new Map(); // idx -> [nearby indices]
  private meleeRange = 1.5;
  private meleeRangeSq = this.meleeRange * this.meleeRange;
  private knockbackRange = 1.1;
  private knockbackRangeSq = this.knockbackRange * this.knockbackRange;

  build(arrays: any): void {
    this.nearbyUnits.clear();

    const activeIndices = arrays.activeIndices;
    const count = activeIndices.length;

    // One N^2 loop to rule them all
    for (let i = 0; i < count; i++) {
      const idxA = activeIndices[i];
      if (arrays.state[idxA] === 3 || arrays.hp[idxA] <= 0) continue;

      const x1 = arrays.posX[idxA];
      const y1 = arrays.posY[idxA];
      const nearby: number[] = [];

      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const idxB = activeIndices[j];
        if (arrays.state[idxB] === 3 || arrays.hp[idxB] <= 0) continue;

        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;

        // Store if within max range we care about
        if (distSq <= this.meleeRangeSq) {
          nearby.push(idxB);
        }
      }

      if (nearby.length > 0) {
        this.nearbyUnits.set(idxA, nearby);
      }
    }
  }

  getMeleeTargets(unitIdx: number, arrays: any): number[] {
    const nearby = this.nearbyUnits.get(unitIdx);
    if (!nearby) return [];

    const result: number[] = [];
    const x1 = arrays.posX[unitIdx];
    const y1 = arrays.posY[unitIdx];
    const team1 = arrays.team[unitIdx];

    for (const idx of nearby) {
      if (arrays.team[idx] === team1) continue; // Same team

      const dx = arrays.posX[idx] - x1;
      const dy = arrays.posY[idx] - y1;
      const distSq = dx * dx + dy * dy;

      if (distSq <= this.meleeRangeSq) {
        result.push(idx);
      }
    }

    return result;
  }

  getKnockbackTargets(unitIdx: number, arrays: any): number[] {
    const nearby = this.nearbyUnits.get(unitIdx);
    if (!nearby) return [];

    const result: number[] = [];
    const x1 = arrays.posX[unitIdx];
    const y1 = arrays.posY[unitIdx];
    const team1 = arrays.team[unitIdx];
    const mass1 = arrays.mass[unitIdx];

    for (const idx of nearby) {
      if (arrays.team[idx] === team1) continue;
      if (arrays.mass[idx] >= mass1) continue; // Only push lighter units

      const dx = arrays.posX[idx] - x1;
      const dy = arrays.posY[idx] - y1;
      const distSq = dx * dx + dy * dy;

      if (distSq <= this.knockbackRangeSq && distSq > 0) {
        result.push(idx);
      }
    }

    return result;
  }
}
