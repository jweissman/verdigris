// Struct-of-Arrays implementation for performance-critical unit data
// This improves cache locality when iterating over units

export class UnitArrays {
  // Core position data - most frequently accessed
  posX: Float32Array;
  posY: Float32Array;
  intendedMoveX: Float32Array;
  intendedMoveY: Float32Array;
  
  // Combat data
  hp: Int16Array;
  maxHp: Int16Array;
  dmg: Int16Array;
  
  // Physics data
  mass: Float32Array;
  
  // Team/state data (using Int8 to save memory)
  team: Int8Array; // 0=neutral, 1=friendly, 2=hostile
  state: Int8Array; // 0=idle, 1=moving, 2=attacking, 3=dead
  
  // Reference to full unit objects (for non-performance-critical data)
  units: any[];
  
  // Track active units
  active: Uint8Array; // 0=inactive, 1=active
  activeCount: number = 0;
  
  capacity: number;
  
  constructor(capacity: number = 1000) {
    this.capacity = capacity;
    
    // Allocate arrays
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.intendedMoveX = new Float32Array(capacity);
    this.intendedMoveY = new Float32Array(capacity);
    
    this.hp = new Int16Array(capacity);
    this.maxHp = new Int16Array(capacity);
    this.dmg = new Int16Array(capacity);
    
    this.mass = new Float32Array(capacity);
    
    this.team = new Int8Array(capacity);
    this.state = new Int8Array(capacity);
    
    this.active = new Uint8Array(capacity);
    this.units = new Array(capacity);
  }
  
  // Add a unit to the arrays
  add(unit: any): number {
    // Find first inactive slot
    let index = -1;
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) {
        index = i;
        break;
      }
    }
    
    if (index === -1) {
      console.warn('UnitArrays: Capacity exceeded');
      return -1;
    }
    
    // Copy data to arrays
    this.posX[index] = unit.pos.x;
    this.posY[index] = unit.pos.y;
    this.intendedMoveX[index] = unit.intendedMove?.x || 0;
    this.intendedMoveY[index] = unit.intendedMove?.y || 0;
    
    this.hp[index] = unit.hp;
    this.maxHp[index] = unit.maxHp;
    this.dmg[index] = unit.dmg || 1;
    
    this.mass[index] = unit.mass || 1;
    
    // Convert team to numeric
    this.team[index] = this.teamToInt(unit.team);
    this.state[index] = this.stateToInt(unit.state);
    
    this.active[index] = 1;
    this.units[index] = unit;
    this.activeCount++;
    
    // Store index in unit for fast lookup
    unit._arrayIndex = index;
    
    return index;
  }
  
  // Remove a unit from the arrays
  remove(index: number): void {
    if (index < 0 || index >= this.capacity) return;
    
    this.active[index] = 0;
    this.units[index] = null;
    this.activeCount--;
  }
  
  // Sync changes from arrays back to unit objects
  syncToUnits(): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      
      const unit = this.units[i];
      if (!unit) continue;
      
      unit.pos.x = this.posX[i];
      unit.pos.y = this.posY[i];
      unit.intendedMove.x = this.intendedMoveX[i];
      unit.intendedMove.y = this.intendedMoveY[i];
      
      unit.hp = this.hp[i];
      unit.maxHp = this.maxHp[i];
      unit.dmg = this.dmg[i];
      
      unit.mass = this.mass[i];
      unit.team = this.intToTeam(this.team[i]);
      unit.state = this.intToState(this.state[i]);
    }
  }
  
  // Sync changes from units to arrays
  syncFromUnits(): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      
      const unit = this.units[i];
      if (!unit) continue;
      
      this.posX[i] = unit.pos.x;
      this.posY[i] = unit.pos.y;
      this.intendedMoveX[i] = unit.intendedMove?.x || 0;
      this.intendedMoveY[i] = unit.intendedMove?.y || 0;
      
      this.hp[i] = unit.hp;
      this.maxHp[i] = unit.maxHp;
      this.dmg[i] = unit.dmg || 1;
      
      this.mass[i] = unit.mass || 1;
      this.team[i] = this.teamToInt(unit.team);
      this.state[i] = this.stateToInt(unit.state);
    }
  }
  
  // Helper methods for conversion
  private teamToInt(team: string): number {
    switch (team) {
      case 'neutral': return 0;
      case 'friendly': return 1;
      case 'hostile': return 2;
      default: return 0;
    }
  }
  
  private intToTeam(value: number): string {
    switch (value) {
      case 0: return 'neutral';
      case 1: return 'friendly';
      case 2: return 'hostile';
      default: return 'neutral';
    }
  }
  
  private stateToInt(state: string): number {
    switch (state) {
      case 'idle': return 0;
      case 'moving': return 1;
      case 'attacking': return 2;
      case 'dead': return 3;
      default: return 0;
    }
  }
  
  private intToState(value: number): string {
    switch (value) {
      case 0: return 'idle';
      case 1: return 'moving';
      case 2: return 'attacking';
      case 3: return 'dead';
      default: return 'idle';
    }
  }
  
  // Fast distance check using arrays
  distanceSquared(i: number, j: number): number {
    const dx = this.posX[i] - this.posX[j];
    const dy = this.posY[i] - this.posY[j];
    return dx * dx + dy * dy;
  }
  
  // Find units within radius (returns indices)
  findUnitsWithinRadius(centerX: number, centerY: number, radius: number): number[] {
    const radiusSq = radius * radius;
    const indices: number[] = [];
    
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      
      const dx = this.posX[i] - centerX;
      const dy = this.posY[i] - centerY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= radiusSq) {
        indices.push(i);
      }
    }
    
    return indices;
  }
  
  // Fast collision detection between all units
  detectCollisions(collisionRadius: number = 1): Array<[number, number]> {
    const collisions: Array<[number, number]> = [];
    const radiusSq = collisionRadius * collisionRadius;
    
    // Check all pairs (this is where spatial indexing would help)
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      
      for (let j = i + 1; j < this.capacity; j++) {
        if (this.active[j] === 0) continue;
        
        const dx = this.posX[i] - this.posX[j];
        const dy = this.posY[i] - this.posY[j];
        const distSq = dx * dx + dy * dy;
        
        if (distSq < radiusSq) {
          collisions.push([i, j]);
        }
      }
    }
    
    return collisions;
  }
}