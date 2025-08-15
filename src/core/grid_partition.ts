/**
 * Grid-based spatial partitioning for O(1) neighbor lookups
 * Divides the field into cells and tracks which units are in each cell
 */

import type { Unit } from '../types/Unit';

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
  
  // Get cell coordinates for a position
  private getCellCoords(x: number, y: number): { cx: number, cy: number } {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return { cx, cy };
  }
  
  // Get cell key
  private getCellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }
  
  // Add unit to grid
  insert(unit: Unit): void {
    const { cx, cy } = this.getCellCoords(unit.pos.x, unit.pos.y);
    const key = this.getCellKey(cx, cy);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, new Set());
    }
    this.cells.get(key)!.add(unit);
  }
  
  // Get all units in a cell
  getCell(x: number, y: number): Unit[] {
    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }
  
  // Get units within radius (checks neighboring cells)
  getNearby(x: number, y: number, radius: number): Unit[] {
    const result: Unit[] = [];
    const radiusSq = radius * radius;
    
    
    // Calculate which cells to check
    const { cx, cy } = this.getCellCoords(x, y);
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    // Check all potentially overlapping cells
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const checkX = cx + dx;
        const checkY = cy + dy;
        
        // Skip out-of-bounds cells
        if (checkX < 0 || checkX >= this.gridWidth || 
            checkY < 0 || checkY >= this.gridHeight) continue;
        
        const key = this.getCellKey(checkX, checkY);
        const cell = this.cells.get(key);
        
        if (cell) {
          // Check actual distance for units in this cell
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
  
  // Get units in exact position (for collision detection)
  getAt(x: number, y: number): Unit[] {
    const result: Unit[] = [];
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    // Only check the cell containing this position
    const { cx, cy } = this.getCellCoords(x, y);
    const key = this.getCellKey(cx, cy);
    const cell = this.cells.get(key);
    
    if (cell) {
      for (const unit of cell) {
        if (Math.round(unit.pos.x) === roundedX && 
            Math.round(unit.pos.y) === roundedY) {
          result.push(unit);
        }
      }
    }
    
    return result;
  }
  
  // Debug: get stats
  getStats(): { totalCells: number, occupiedCells: number, maxUnitsPerCell: number } {
    let maxUnitsPerCell = 0;
    
    for (const cell of this.cells.values()) {
      maxUnitsPerCell = Math.max(maxUnitsPerCell, cell.size);
    }
    
    return {
      totalCells: this.gridWidth * this.gridHeight,
      occupiedCells: this.cells.size,
      maxUnitsPerCell
    };
  }
}