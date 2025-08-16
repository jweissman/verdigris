export interface IndexedIntent {
  ruleId: string;
  maxDistanceSq?: number; // Pre-squared for efficiency

  callback: (idxA: number, idxB: number) => void;

  filter?: (idxA: number, idxB: number) => boolean;
}

export class IndexedPairwiseBatcher {
  private intents: IndexedIntent[] = [];

  register(
    ruleId: string,
    callback: (idxA: number, idxB: number) => void,
    maxDistance?: number,
    filter?: (idxA: number, idxB: number) => boolean,
  ): void {
    this.intents.push({
      ruleId,
      callback,
      maxDistanceSq: maxDistance ? maxDistance * maxDistance : undefined,
      filter,
    });
  }

  process(arrays: any): void {
    const capacity = arrays.capacity;

    const activeIndices: number[] = [];
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] && arrays.state[i] !== 3) {
        activeIndices.push(i);
      }
    }

    const count = activeIndices.length;

    if (count > 50 && this.intents.some((i) => i.maxDistanceSq !== undefined)) {
      this.processSpatial(arrays, activeIndices);
    } else {
      this.processBrute(arrays, activeIndices);
    }

    this.intents = [];
  }

  private processBrute(arrays: any, activeIndices: number[]): void {
    const count = activeIndices.length;

    for (let i = 0; i < count; i++) {
      const idxA = activeIndices[i];
      const x1 = arrays.posX[idxA];
      const y1 = arrays.posY[idxA];

      for (let j = i + 1; j < count; j++) {
        const idxB = activeIndices[j];

        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;

        for (const intent of this.intents) {
          if (
            intent.maxDistanceSq !== undefined &&
            distSq > intent.maxDistanceSq
          ) {
            continue;
          }

          if (intent.filter && !intent.filter(idxA, idxB)) {
            continue;
          }

          intent.callback(idxA, idxB);
          intent.callback(idxB, idxA);
        }
      }
    }
  }

  private processSpatial(arrays: any, activeIndices: number[]): void {
    let maxRadius = 0;
    for (const intent of this.intents) {
      if (intent.maxDistanceSq !== undefined) {
        maxRadius = Math.max(maxRadius, Math.sqrt(intent.maxDistanceSq));
      }
    }

    const cellSize = Math.ceil(maxRadius);
    const gridWidth = Math.ceil(100 / cellSize); // Assuming 100x100 field
    const gridHeight = gridWidth;
    const grid: number[][] = new Array(gridWidth * gridHeight);

    for (const idx of activeIndices) {
      const gx = Math.floor(arrays.posX[idx] / cellSize);
      const gy = Math.floor(arrays.posY[idx] / cellSize);
      const cell = gy * gridWidth + gx;
      if (!grid[cell]) grid[cell] = [];
      grid[cell].push(idx);
    }

    for (let cy = 0; cy < gridHeight; cy++) {
      for (let cx = 0; cx < gridWidth; cx++) {
        const cell = cy * gridWidth + cx;
        const units = grid[cell];
        if (!units) continue;

        for (let i = 0; i < units.length; i++) {
          for (let j = i + 1; j < units.length; j++) {
            this.processPair(arrays, units[i], units[j]);
          }
        }

        const neighbors = [
          [cx + 1, cy],
          [cx, cy + 1],
          [cx + 1, cy + 1],
          [cx - 1, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= gridWidth || ny >= gridHeight) continue;
          const neighborCell = ny * gridWidth + nx;
          const neighborUnits = grid[neighborCell];
          if (!neighborUnits) continue;

          for (const idxA of units) {
            for (const idxB of neighborUnits) {
              this.processPair(arrays, idxA, idxB);
            }
          }
        }
      }
    }
  }

  private processPair(arrays: any, idxA: number, idxB: number): void {
    const dx = arrays.posX[idxB] - arrays.posX[idxA];
    const dy = arrays.posY[idxB] - arrays.posY[idxA];
    const distSq = dx * dx + dy * dy;

    for (const intent of this.intents) {
      if (intent.maxDistanceSq !== undefined && distSq > intent.maxDistanceSq) {
        continue;
      }

      if (intent.filter && !intent.filter(idxA, idxB)) {
        continue;
      }

      intent.callback(idxA, idxB);
      intent.callback(idxB, idxA);
    }
  }
}
