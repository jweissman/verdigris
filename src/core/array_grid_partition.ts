/**
 * Optimized grid-based spatial partitioning that works directly with UnitArrays
 * Avoids proxy creation for maximum performance
 */

import type { UnitArrays } from "../sim/unit_arrays";

export class ArrayGridPartition {
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private cells: Map<string, number[]>; // Store indices instead of units

  constructor(fieldWidth: number, fieldHeight: number, cellSize: number = 4) {
    this.cellSize = cellSize;
    this.gridWidth = Math.ceil(fieldWidth / cellSize);
    this.gridHeight = Math.ceil(fieldHeight / cellSize);
    this.cells = new Map();
  }

  clear(): void {
    this.cells.clear();
  }

  private getCellCoords(x: number, y: number): { cx: number; cy: number } {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return { cx, cy };
  }

  private getCellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  rebuild(arrays: UnitArrays): void {
    this.clear();
    
    for (const i of arrays.activeIndices) {
      const x = arrays.posX[i];
      const y = arrays.posY[i];
      const { cx, cy } = this.getCellCoords(x, y);
      const key = this.getCellKey(cx, cy);

      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key)!.push(i);
    }
  }

  getNearbyIndices(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const radiusSq = radius * radius;

    const { cx, cy } = this.getCellCoords(x, y);
    const cellRadius = Math.ceil(radius / this.cellSize);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = cx + dx;
        const checkY = cy + dy;

        if (
          checkX < 0 ||
          checkX >= this.gridWidth ||
          checkY < 0 ||
          checkY >= this.gridHeight
        )
          continue;

        const key = this.getCellKey(checkX, checkY);
        const cell = this.cells.get(key);

        if (cell) {
          result.push(...cell);
        }
      }
    }

    return result;
  }
}