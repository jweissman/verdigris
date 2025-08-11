/**
 * Struct-of-Arrays (SoA) representation for units
 * Dramatically improves cache locality and enables SIMD operations
 */

export interface UnitArraysView {
  // Core arrays
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hp: Int16Array;
  maxHp: Int16Array;
  dmg: Uint8Array;
  team: Uint8Array; // 0=neutral, 1=friendly, 2=hostile
  state: Uint8Array; // idle=0, moving=1, attacking=2, dead=3
  mass: Float32Array;
  
  // Metadata arrays
  spriteId: Uint16Array; // Index into sprite table
  abilityMask: Uint32Array; // Bitmask for abilities
  
  // Tracking
  count: number;
  capacity: number;
  freeList: number[]; // Indices of deleted units for reuse
  idToIndex: Map<string, number>; // Map unit IDs to array indices
  indexToId: string[]; // Array index to unit ID
}

export class UnitArrays implements UnitArraysView {
  // Position arrays
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  
  // Velocity arrays
  vx: Float32Array;
  vy: Float32Array;
  
  // Stats arrays
  hp: Int16Array;
  maxHp: Int16Array;
  dmg: Uint8Array;
  team: Uint8Array;
  state: Uint8Array;
  mass: Float32Array;
  
  // Metadata
  spriteId: Uint16Array;
  abilityMask: Uint32Array;
  
  // Tracking
  count: number = 0;
  capacity: number;
  freeList: number[] = [];
  idToIndex: Map<string, number> = new Map();
  indexToId: string[] = [];
  
  // Dirty tracking for rendering
  dirtyMask: Uint8Array; // 1 = dirty, 0 = clean
  
  constructor(capacity: number = 1024) {
    this.capacity = capacity;
    
    // Allocate arrays
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    
    this.hp = new Int16Array(capacity);
    this.maxHp = new Int16Array(capacity);
    this.dmg = new Uint8Array(capacity);
    this.team = new Uint8Array(capacity);
    this.state = new Uint8Array(capacity);
    this.mass = new Float32Array(capacity);
    
    this.spriteId = new Uint16Array(capacity);
    this.abilityMask = new Uint32Array(capacity);
    
    this.dirtyMask = new Uint8Array(capacity);
    this.indexToId = new Array(capacity).fill('');
  }
  
  add(id: string, x: number, y: number, hp: number, maxHp: number, team: number): number {
    let idx: number;
    
    // Reuse freed index if available
    if (this.freeList.length > 0) {
      idx = this.freeList.pop()!;
    } else {
      if (this.count >= this.capacity) {
        this.grow();
      }
      idx = this.count;
      this.count++;
    }
    
    // Set data
    this.x[idx] = x;
    this.y[idx] = y;
    this.z[idx] = 0;
    this.vx[idx] = 0;
    this.vy[idx] = 0;
    this.hp[idx] = hp;
    this.maxHp[idx] = maxHp;
    this.dmg[idx] = 5; // default damage
    this.team[idx] = team;
    this.state[idx] = 0; // idle
    this.mass[idx] = 1; // default mass
    
    // Track ID mapping
    this.idToIndex.set(id, idx);
    this.indexToId[idx] = id;
    
    // Mark as dirty for rendering
    this.dirtyMask[idx] = 1;
    
    return idx;
  }
  
  remove(id: string): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    
    // Mark as dead
    this.state[idx] = 3; // dead state
    this.hp[idx] = 0;
    
    // Add to free list for reuse
    this.freeList.push(idx);
    
    // Remove ID mapping
    this.idToIndex.delete(id);
    this.indexToId[idx] = '';
    
    // Mark as dirty
    this.dirtyMask[idx] = 1;
  }
  
  setPosition(id: string, x: number, y: number, z: number = 0): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    
    this.x[idx] = x;
    this.y[idx] = y;
    this.z[idx] = z;
    this.dirtyMask[idx] = 1;
  }
  
  setVelocity(id: string, vx: number, vy: number): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    
    this.vx[idx] = vx;
    this.vy[idx] = vy;
    this.dirtyMask[idx] = 1;
  }
  
  damage(id: string, amount: number): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    
    this.hp[idx] = Math.max(0, this.hp[idx] - amount);
    this.dirtyMask[idx] = 1;
    
    if (this.hp[idx] <= 0) {
      this.state[idx] = 3; // dead state
    }
  }
  
  heal(id: string, amount: number): void {
    const idx = this.idToIndex.get(id);
    if (idx === undefined) return;
    
    this.hp[idx] = Math.min(this.maxHp[idx], this.hp[idx] + amount);
    this.dirtyMask[idx] = 1;
  }
  
  /**
   * Batch update all unit positions based on velocities
   * This is where SIMD would shine in native code
   */
  updatePositions(deltaTime: number = 1): void {
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] === 3) continue; // Skip dead units
      
      if (this.vx[i] !== 0 || this.vy[i] !== 0) {
        this.x[i] += this.vx[i] * deltaTime;
        this.y[i] += this.vy[i] * deltaTime;
        this.dirtyMask[i] = 1;
      }
    }
  }
  
  /**
   * Find units within radius of a point
   * Can be optimized with spatial hashing
   */
  findNearby(centerX: number, centerY: number, radius: number): number[] {
    const radiusSq = radius * radius;
    const results: number[] = [];
    
    for (let i = 0; i < this.count; i++) {
      if (this.state[i] === 3) continue; // Skip dead
      
      const dx = this.x[i] - centerX;
      const dy = this.y[i] - centerY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq <= radiusSq) {
        results.push(i);
      }
    }
    
    return results;
  }
  
  /**
   * Process collision detection between all units
   * This is a hot path that benefits greatly from SoA
   */
  processCollisions(callback: (i: number, j: number, dist: number) => void): void {
    const collisionRadius = 1.5;
    const radiusSq = collisionRadius * collisionRadius;
    
    // This loop structure is cache-friendly
    for (let i = 0; i < this.count - 1; i++) {
      if (this.state[i] === 3) continue;
      
      for (let j = i + 1; j < this.count; j++) {
        if (this.state[j] === 3) continue;
        if (this.team[i] === this.team[j]) continue;
        
        const dx = this.x[i] - this.x[j];
        const dy = this.y[i] - this.y[j];
        const distSq = dx * dx + dy * dy;
        
        if (distSq < radiusSq) {
          callback(i, j, Math.sqrt(distSq));
        }
      }
    }
  }
  
  clearDirty(): void {
    this.dirtyMask.fill(0);
  }
  
  getDirtyIndices(): number[] {
    const dirty: number[] = [];
    for (let i = 0; i < this.count; i++) {
      if (this.dirtyMask[i] === 1) {
        dirty.push(i);
      }
    }
    return dirty;
  }
  
  private grow(): void {
    const newCapacity = this.capacity * 2;
    
    // Allocate new arrays
    const newX = new Float32Array(newCapacity);
    const newY = new Float32Array(newCapacity);
    const newZ = new Float32Array(newCapacity);
    const newVx = new Float32Array(newCapacity);
    const newVy = new Float32Array(newCapacity);
    const newHp = new Int16Array(newCapacity);
    const newMaxHp = new Int16Array(newCapacity);
    const newDmg = new Uint8Array(newCapacity);
    const newTeam = new Uint8Array(newCapacity);
    const newState = new Uint8Array(newCapacity);
    const newMass = new Float32Array(newCapacity);
    const newSpriteId = new Uint16Array(newCapacity);
    const newAbilityMask = new Uint32Array(newCapacity);
    const newDirtyMask = new Uint8Array(newCapacity);
    
    // Copy existing data
    newX.set(this.x);
    newY.set(this.y);
    newZ.set(this.z);
    newVx.set(this.vx);
    newVy.set(this.vy);
    newHp.set(this.hp);
    newMaxHp.set(this.maxHp);
    newDmg.set(this.dmg);
    newTeam.set(this.team);
    newState.set(this.state);
    newMass.set(this.mass);
    newSpriteId.set(this.spriteId);
    newAbilityMask.set(this.abilityMask);
    newDirtyMask.set(this.dirtyMask);
    
    // Replace arrays
    this.x = newX;
    this.y = newY;
    this.z = newZ;
    this.vx = newVx;
    this.vy = newVy;
    this.hp = newHp;
    this.maxHp = newMaxHp;
    this.dmg = newDmg;
    this.team = newTeam;
    this.state = newState;
    this.mass = newMass;
    this.spriteId = newSpriteId;
    this.abilityMask = newAbilityMask;
    this.dirtyMask = newDirtyMask;
    
    // Grow ID array
    const newIndexToId = new Array(newCapacity).fill('');
    for (let i = 0; i < this.capacity; i++) {
      newIndexToId[i] = this.indexToId[i];
    }
    this.indexToId = newIndexToId;
    
    this.capacity = newCapacity;
  }
}