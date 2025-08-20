import { Vec2 } from "../../types/Vec2";

/**
 * PositionStore - Component store for unit positions
 * Part of the SoA (Structure of Arrays) architecture refactoring
 *
 * This store manages position data for all units efficiently,
 * providing fast access and updates without object allocation.
 */
export class PositionStore {
  private posX: Float32Array;
  private posY: Float32Array;
  private intendedMoveX: Float32Array;
  private intendedMoveY: Float32Array;
  private capacity: number;
  private activeCount: number = 0;
  private freeIndices: number[] = [];
  private unitIdToIndex: Map<string, number> = new Map();

  constructor(capacity: number = 10000) {
    this.capacity = capacity;
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.intendedMoveX = new Float32Array(capacity);
    this.intendedMoveY = new Float32Array(capacity);
  }

  /**
   * Allocate a position slot for a unit
   */
  allocate(unitId: string, x: number = 0, y: number = 0): number {
    let index: number;

    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else if (this.activeCount < this.capacity) {
      index = this.activeCount++;
    } else {
      throw new Error("PositionStore capacity exceeded");
    }

    this.unitIdToIndex.set(unitId, index);
    this.posX[index] = x;
    this.posY[index] = y;
    this.intendedMoveX[index] = 0;
    this.intendedMoveY[index] = 0;

    return index;
  }

  /**
   * Free a position slot
   */
  free(unitId: string): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.unitIdToIndex.delete(unitId);
    this.freeIndices.push(index);

    this.posX[index] = 0;
    this.posY[index] = 0;
    this.intendedMoveX[index] = 0;
    this.intendedMoveY[index] = 0;
  }

  /**
   * Get position by unit ID
   */
  getPosition(unitId: string): Vec2 | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;

    return {
      x: this.posX[index],
      y: this.posY[index],
    };
  }

  /**
   * Get position by index (fast path)
   */
  getPositionByIndex(index: number): Vec2 {
    return {
      x: this.posX[index],
      y: this.posY[index],
    };
  }

  /**
   * Set position by unit ID
   */
  setPosition(unitId: string, x: number, y: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.posX[index] = x;
    this.posY[index] = y;
  }

  /**
   * Set position by index (fast path)
   */
  setPositionByIndex(index: number, x: number, y: number): void {
    this.posX[index] = x;
    this.posY[index] = y;
  }

  /**
   * Get intended move by unit ID
   */
  getIntendedMove(unitId: string): Vec2 | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;

    return {
      x: this.intendedMoveX[index],
      y: this.intendedMoveY[index],
    };
  }

  /**
   * Set intended move by unit ID
   */
  setIntendedMove(unitId: string, x: number, y: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.intendedMoveX[index] = x;
    this.intendedMoveY[index] = y;
  }

  /**
   * Set intended move by index (fast path)
   */
  setIntendedMoveByIndex(index: number, x: number, y: number): void {
    this.intendedMoveX[index] = x;
    this.intendedMoveY[index] = y;
  }

  /**
   * Find units within a radius of a point
   */
  findUnitsInRadius(
    centerX: number,
    centerY: number,
    radius: number,
  ): string[] {
    const result: string[] = [];
    const radiusSq = radius * radius;

    for (const [unitId, index] of this.unitIdToIndex) {
      const dx = this.posX[index] - centerX;
      const dy = this.posY[index] - centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        result.push(unitId);
      }
    }

    return result;
  }

  /**
   * Find units within a rectangle
   */
  findUnitsInRect(x1: number, y1: number, x2: number, y2: number): string[] {
    const result: string[] = [];
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (const [unitId, index] of this.unitIdToIndex) {
      const x = this.posX[index];
      const y = this.posY[index];

      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        result.push(unitId);
      }
    }

    return result;
  }

  /**
   * Get the index for a unit ID
   */
  getIndex(unitId: string): number | undefined {
    return this.unitIdToIndex.get(unitId);
  }

  /**
   * Get all active unit IDs
   */
  getAllUnitIds(): string[] {
    return Array.from(this.unitIdToIndex.keys());
  }

  /**
   * Get raw arrays for direct access (hot path optimization)
   */
  getArrays() {
    return {
      posX: this.posX,
      posY: this.posY,
      intendedMoveX: this.intendedMoveX,
      intendedMoveY: this.intendedMoveY,
      unitIdToIndex: this.unitIdToIndex,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.unitIdToIndex.clear();
    this.freeIndices = [];
    this.activeCount = 0;
    this.posX.fill(0);
    this.posY.fill(0);
    this.intendedMoveX.fill(0);
    this.intendedMoveY.fill(0);
  }
}
