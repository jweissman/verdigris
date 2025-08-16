/**
 * Grid-based spatial partitioning for O(1) neighbor lookups
 * Divides the field into cells and tracks which units are in each cell
 */

import type { Unit } from "../types/Unit";

export class GridPartition {
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private cells: Map<string, Set<Unit>>;

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

  insert(unit: Unit): void {
    const { cx, cy } = this.getCellCoords(unit.pos.x, unit.pos.y);
    const key = this.getCellKey(cx, cy);

    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(unit);
  }

  getCell(x: number, y: number): Unit[] {
    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }

  getNearby(x: number, y: number, radius: number): Unit[] {
    const result: Unit[] = [];
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
          for (const unit of cell) {
            const dx = unit.pos.x - x;
            const dy = unit.pos.y - y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= radiusSq) {
              result.push(unit);
            }
          }
        }
      }
    }

    return result;
  }

  getAt(x: number, y: number): Unit[] {
    const result: Unit[] = [];
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);

    if (cell) {
      for (const unit of cell) {
        if (
          Math.round(unit.pos.x) === roundedX &&
          Math.round(unit.pos.y) === roundedY
        ) {
          result.push(unit);
        }
      }
    }

    return result;
  }

  getStats(): {
    totalCells: number;
    occupiedCells: number;
    maxUnitsPerCell: number;
  } {
    let maxUnitsPerCell = 0;

    for (const cell of this.cells.values()) {
      maxUnitsPerCell = Math.max(maxUnitsPerCell, cell.size);
    }

    return {
      totalCells: this.gridWidth * this.gridHeight,
      occupiedCells: this.cells.size,
      maxUnitsPerCell,
    };
  }
}
