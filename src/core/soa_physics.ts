import { SoAStorage } from './soa_storage';

/**
 * Vectorized physics operations on SoA storage
 * These operations process all units at once using array operations
 */
export class SoAPhysics {
  private storage: SoAStorage;
  
  constructor(storage: SoAStorage) {
    this.storage = storage;
  }
  
  /**
   * Process all AI decisions in a single vectorized pass
   * Much faster than individual unit processing
   */
  processAI(): void {
    const s = this.storage;
    
    // Build spatial index for fast neighbor queries
    const spatialIndex = this.buildSpatialIndex();
    
    // Process each active unit
    for (let i = 0; i < s.capacity; i++) {
      if (s.active[i] === 0 || s.state[i] === 3) continue; // Skip inactive/dead
      
      // Find closest enemy and ally using spatial index
      const neighbors = this.getNeighbors(i, spatialIndex, 15); // 15 unit radius
      
      let closestEnemyIdx = -1;
      let closestAllyIdx = -1;
      let closestEnemyDist = Infinity;
      let closestAllyDist = Infinity;
      
      for (const j of neighbors) {
        if (j === i) continue;
        
        const dx = s.posX[j] - s.posX[i];
        const dy = s.posY[j] - s.posY[i];
        const distSq = dx * dx + dy * dy;
        
        if (s.team[j] !== s.team[i]) {
          // Enemy
          if (distSq < closestEnemyDist) {
            closestEnemyDist = distSq;
            closestEnemyIdx = j;
          }
        } else {
          // Ally
          if (distSq < closestAllyDist) {
            closestAllyDist = distSq;
            closestAllyIdx = j;
          }
        }
      }
      
      // Set movement based on AI behavior
      // For now, simple hunt behavior
      if (closestEnemyIdx !== -1) {
        const dx = s.posX[closestEnemyIdx] - s.posX[i];
        const dy = s.posY[closestEnemyIdx] - s.posY[i];
        
        // Set intended movement (grid-based)
        if (Math.abs(dx) > Math.abs(dy)) {
          s.intendedMoveX[i] = dx > 0 ? 1 : -1;
          s.intendedMoveY[i] = 0;
        } else if (Math.abs(dy) > 0) {
          s.intendedMoveX[i] = 0;
          s.intendedMoveY[i] = dy > 0 ? 1 : -1;
        }
      }
    }
  }
  
  /**
   * Apply all forces and movement in a vectorized operation
   */
  applyForces(fieldWidth: number, fieldHeight: number): void {
    const s = this.storage;
    
    // First, apply all intended moves to get new positions
    const newPosX = new Float32Array(s.capacity);
    const newPosY = new Float32Array(s.capacity);
    
    for (let i = 0; i < s.capacity; i++) {
      if (s.active[i] === 0 || s.state[i] === 3) continue;
      
      // Calculate new position
      newPosX[i] = s.posX[i] + s.intendedMoveX[i];
      newPosY[i] = s.posY[i] + s.intendedMoveY[i];
      
      // Clamp to bounds
      newPosX[i] = Math.max(0, Math.min(fieldWidth - 1, newPosX[i]));
      newPosY[i] = Math.max(0, Math.min(fieldHeight - 1, newPosY[i]));
    }
    
    // Resolve collisions using mass-based priority
    const collisions = this.detectCollisionsForMovement(newPosX, newPosY);
    
    for (const [i, j] of collisions) {
      const priorityI = s.mass[i] * 10 + s.hp[i];
      const priorityJ = s.mass[j] * 10 + s.hp[j];
      
      if (priorityI > priorityJ) {
        // i wins, j gets displaced
        this.displaceUnit(j, newPosX, newPosY, fieldWidth, fieldHeight);
      } else {
        // j wins, i gets displaced
        this.displaceUnit(i, newPosX, newPosY, fieldWidth, fieldHeight);
      }
    }
    
    // Apply final positions
    for (let i = 0; i < s.capacity; i++) {
      if (s.active[i] === 0) continue;
      s.posX[i] = newPosX[i];
      s.posY[i] = newPosY[i];
    }
  }
  
  /**
   * Build spatial index for fast neighbor queries
   */
  private buildSpatialIndex(): Map<string, number[]> {
    const s = this.storage;
    const index = new Map<string, number[]>();
    
    for (let i = 0; i < s.capacity; i++) {
      if (s.active[i] === 0) continue;
      
      const gridX = Math.floor(s.posX[i] / 5); // 5-unit grid cells
      const gridY = Math.floor(s.posY[i] / 5);
      
      // Add to current and adjacent cells for radius queries
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${gridX + dx},${gridY + dy}`;
          if (!index.has(key)) {
            index.set(key, []);
          }
          index.get(key)!.push(i);
        }
      }
    }
    
    return index;
  }
  
  /**
   * Get neighbors within radius using spatial index
   */
  private getNeighbors(unitIdx: number, spatialIndex: Map<string, number[]>, radius: number): number[] {
    const s = this.storage;
    const x = s.posX[unitIdx];
    const y = s.posY[unitIdx];
    const gridX = Math.floor(x / 5);
    const gridY = Math.floor(y / 5);
    
    const neighbors = new Set<number>();
    const radiusSq = radius * radius;
    
    // Check cells within radius
    const cellRadius = Math.ceil(radius / 5);
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const cellUnits = spatialIndex.get(key);
        if (!cellUnits) continue;
        
        for (const j of cellUnits) {
          if (j === unitIdx) continue;
          
          const distX = s.posX[j] - x;
          const distY = s.posY[j] - y;
          const distSq = distX * distX + distY * distY;
          
          if (distSq <= radiusSq) {
            neighbors.add(j);
          }
        }
      }
    }
    
    return Array.from(neighbors);
  }
  
  /**
   * Detect collisions for proposed movement
   */
  private detectCollisionsForMovement(newPosX: Float32Array, newPosY: Float32Array): Array<[number, number]> {
    const s = this.storage;
    const collisions: Array<[number, number]> = [];
    const occupied = new Map<string, number>();
    
    // Check for units trying to move to same position
    for (let i = 0; i < s.capacity; i++) {
      if (s.active[i] === 0 || s.state[i] === 3) continue;
      
      const key = `${Math.round(newPosX[i])},${Math.round(newPosY[i])}`;
      
      if (occupied.has(key)) {
        collisions.push([occupied.get(key)!, i]);
      } else {
        occupied.set(key, i);
      }
    }
    
    return collisions;
  }
  
  /**
   * Displace a unit to an adjacent free position
   */
  private displaceUnit(idx: number, newPosX: Float32Array, newPosY: Float32Array, fieldWidth: number, fieldHeight: number): void {
    const s = this.storage;
    const x = newPosX[idx];
    const y = newPosY[idx];
    
    // Try adjacent positions
    const displacements = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1]];
    
    for (const [dx, dy] of displacements) {
      const testX = x + dx;
      const testY = y + dy;
      
      // Check bounds
      if (testX < 0 || testX >= fieldWidth || testY < 0 || testY >= fieldHeight) {
        continue;
      }
      
      // Check if position is free
      let occupied = false;
      for (let j = 0; j < s.capacity; j++) {
        if (s.active[j] === 0 || j === idx) continue;
        
        if (Math.round(newPosX[j]) === Math.round(testX) && 
            Math.round(newPosY[j]) === Math.round(testY)) {
          occupied = true;
          break;
        }
      }
      
      if (!occupied) {
        newPosX[idx] = testX;
        newPosY[idx] = testY;
        return;
      }
    }
    
    // If no free position, stay in place
    newPosX[idx] = s.posX[idx];
    newPosY[idx] = s.posY[idx];
  }
}