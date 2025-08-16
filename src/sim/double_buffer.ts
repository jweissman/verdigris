/**
 * Double-buffered world state for performance optimization
 * Allows mutations without affecting current frame's calculations
 */

export interface BufferedState<T> {
  current: T;
  next: T;
  swap(): void;
}

export class DoubleBuffer<T> implements BufferedState<T> {
  private bufferA: T;
  private bufferB: T;
  private isUsingA: boolean = true;

  constructor(initialState: T, clone: (state: T) => T) {
    this.bufferA = initialState;
    this.bufferB = clone(initialState);
  }

  get current(): T {
    return this.isUsingA ? this.bufferA : this.bufferB;
  }

  get next(): T {
    return this.isUsingA ? this.bufferB : this.bufferA;
  }

  swap(): void {
    this.isUsingA = !this.isUsingA;
  }
}

// /**

//  */

/**
 * Spatial hash for broad-phase collision detection
 */
export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();

  constructor(cellSize: number = 4) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  insert(id: string, x: number, y: number): void {
    const key = this.getKey(x, y);

    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }

    this.cells.get(key)!.add(id);
  }

  query(x: number, y: number, radius: number = 1): string[] {
    const results: Set<string> = new Set();

    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = `${cx},${cy}`;
        const cell = this.cells.get(key);

        if (cell) {
          cell.forEach((id) => results.add(id));
        }
      }
    }

    return Array.from(results);
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }
}
