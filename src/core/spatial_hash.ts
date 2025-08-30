/**
 * Lightweight spatial hash for fast collision detection
 * Optimized for projectile-unit collision checks
 */
export class SpatialHash {
  private cellSize: number;
  private cells: Map<number, number[]>;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear(): void {
    this.cells.clear();
  }

  private getKey(x: number, y: number): number {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    // Simple hash function that works well for 2D grids
    return (cx * 0x1f1f1f1f) ^ cy;
  }

  insert(x: number, y: number, index: number): void {
    const key = this.getKey(x, y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(index);
  }

  /**
   * Get all entity indices within radius of a point
   * Returns indices that are in cells that could contain entities within radius
   */
  query(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);

    // Check all cells that could contain entities within radius
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = x + dx * this.cellSize;
        const checkY = y + dy * this.cellSize;
        const key = this.getKey(checkX, checkY);
        const cell = this.cells.get(key);
        if (cell) {
          for (const index of cell) {
            result.push(index);
          }
        }
      }
    }

    return result;
  }

  /**
   * Build spatial hash from unit arrays
   */
  buildFromArrays(
    posX: Float32Array,
    posY: Float32Array,
    activeIndices: number[],
  ): void {
    this.clear();
    for (const idx of activeIndices) {
      this.insert(posX[idx], posY[idx], idx);
    }
  }
}
