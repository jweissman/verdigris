/**
 * Ultra-fast spatial adjacency checker for combat/knockback
 * Most rules only care about immediate neighbors (distance <= 1.5)
 * Uses 1x1 grid cells and only checks 9 surrounding cells
 */
export class SpatialAdjacency {
  private grid: Map<number, number[]> = new Map();
  private gridWidth: number;
  private gridHeight: number;

  constructor(fieldWidth: number, fieldHeight: number) {
    this.gridWidth = fieldWidth;
    this.gridHeight = fieldHeight;
  }

  /**
   * Build grid from typed arrays - O(n) operation
   */
  buildFromArrays(arrays: any, activeIndices: number[]): void {
    this.grid.clear();

    for (const idx of activeIndices) {
      const x = Math.floor(arrays.posX[idx]);
      const y = Math.floor(arrays.posY[idx]);
      const cell = y * this.gridWidth + x;

      if (!this.grid.has(cell)) {
        this.grid.set(cell, []);
      }
      this.grid.get(cell)!.push(idx);
    }
  }

  /**
   * Process adjacency checks - only looks at 9 cells
   * Callback receives indices, not units (avoid proxy creation)
   */
  processAdjacent(
    arrays: any,
    maxDistSq: number,
    callback: (idxA: number, idxB: number, distSq: number) => void,
  ): void {
    for (const [cellKey, indices] of this.grid) {
      const cellY = Math.floor(cellKey / this.gridWidth);
      const cellX = cellKey % this.gridWidth;

      for (let i = 0; i < indices.length; i++) {
        const idxA = indices[i];
        const x1 = arrays.posX[idxA];
        const y1 = arrays.posY[idxA];

        for (let j = i + 1; j < indices.length; j++) {
          const idxB = indices[j];
          const dx = arrays.posX[idxB] - x1;
          const dy = arrays.posY[idxB] - y1;
          const distSq = dx * dx + dy * dy;

          if (distSq <= maxDistSq) {
            callback(idxA, idxB, distSq);
          }
        }

        const neighbors = [
          [cellX + 1, cellY],
          [cellX, cellY + 1],
          [cellX + 1, cellY + 1],
          [cellX - 1, cellY + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= this.gridWidth || ny >= this.gridHeight) continue;

          const neighborCell = ny * this.gridWidth + nx;
          const neighborIndices = this.grid.get(neighborCell);
          if (!neighborIndices) continue;

          for (const idxB of neighborIndices) {
            const dx = arrays.posX[idxB] - x1;
            const dy = arrays.posY[idxB] - y1;
            const distSq = dx * dx + dy * dy;

            if (distSq <= maxDistSq) {
              callback(idxA, idxB, distSq);
            }
          }
        }
      }
    }
  }

  /**
   * Specialized melee check - only enemies within 1.5 units
   * Returns pairs of [attacker_idx, target_idx]
   */
  getMeleePairs(arrays: any): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    const MELEE_RANGE_SQ = 1.5 * 1.5;

    this.processAdjacent(arrays, MELEE_RANGE_SQ, (idxA, idxB, distSq) => {
      if (arrays.team[idxA] !== arrays.team[idxB]) {
        if (arrays.hp[idxA] > 0 && arrays.hp[idxB] > 0) {
          pairs.push([idxA, idxB]);
          pairs.push([idxB, idxA]); // Both directions
        }
      }
    });

    return pairs;
  }

  /**
   * Specialized knockback check - units occupying same cell
   */
  getKnockbackPairs(arrays: any): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    const KNOCKBACK_RANGE_SQ = 0.75 * 0.75; // Very close for knockback

    this.processAdjacent(arrays, KNOCKBACK_RANGE_SQ, (idxA, idxB, distSq) => {
      const massA = arrays.mass ? arrays.mass[idxA] : 1;
      const massB = arrays.mass ? arrays.mass[idxB] : 1;

      if (massA > 0 && massB > 0) {
        pairs.push([idxA, idxB]);
      }
    });

    return pairs;
  }
}
