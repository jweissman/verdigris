/**
 * Double-buffered world state for performance optimization
 * Allows mutations without affecting current frame's calculations
 */

// export interface BufferedState<T> {
//   current: T;
//   next: T;
//   swap(): void;
// }

// export class DoubleBuffer<T> implements BufferedState<T> {
//   private bufferA: T;
//   private bufferB: T;
//   private isUsingA: boolean = true;

//   constructor(initialState: T, clone: (state: T) => T) {
//     this.bufferA = initialState;
//     this.bufferB = clone(initialState);
//   }

//   get current(): T {
//     return this.isUsingA ? this.bufferA : this.bufferB;
//   }

//   get next(): T {
//     return this.isUsingA ? this.bufferB : this.bufferA;
//   }

//   swap(): void {
//     this.isUsingA = !this.isUsingA;
//   }
// }

// /**
//  * Struct-of-Arrays representation for units
//  * Improves cache locality and enables SIMD operations
//  */
// export class UnitArrays {
//   // Position arrays
//   x: Float32Array;
//   y: Float32Array;
//   z: Float32Array;
  
//   // Velocity arrays
//   vx: Float32Array;
//   vy: Float32Array;
  
//   // Stats arrays
//   hp: Int16Array;
//   maxHp: Int16Array;
//   team: Uint8Array; // 0=neutral, 1=friendly, 2=hostile
//   state: Uint8Array; // idle, moving, attacking, etc.
  
//   // Metadata
//   count: number = 0;
//   capacity: number;
  
//   // Index tracking for dirty updates
//   dirtyIndices: Set<number> = new Set();
  
//   constructor(capacity: number = 1024) {
//     this.capacity = capacity;
    
//     // Allocate arrays
//     this.x = new Float32Array(capacity);
//     this.y = new Float32Array(capacity);
//     this.z = new Float32Array(capacity);
    
//     this.vx = new Float32Array(capacity);
//     this.vy = new Float32Array(capacity);
    
//     this.hp = new Int16Array(capacity);
//     this.maxHp = new Int16Array(capacity);
//     this.team = new Uint8Array(capacity);
//     this.state = new Uint8Array(capacity);
//   }
  
//   add(x: number, y: number, hp: number, maxHp: number, team: number): number {
//     if (this.count >= this.capacity) {
//       this.grow();
//     }
    
//     const idx = this.count;
//     this.x[idx] = x;
//     this.y[idx] = y;
//     this.z[idx] = 0;
//     this.hp[idx] = hp;
//     this.maxHp[idx] = maxHp;
//     this.team[idx] = team;
//     this.state[idx] = 0; // idle
    
//     this.dirtyIndices.add(idx);
//     this.count++;
    
//     return idx;
//   }
  
//   remove(idx: number): void {
//     if (idx >= this.count) return;
    
//     // Swap with last element
//     const lastIdx = this.count - 1;
//     if (idx !== lastIdx) {
//       this.x[idx] = this.x[lastIdx];
//       this.y[idx] = this.y[lastIdx];
//       this.z[idx] = this.z[lastIdx];
//       this.vx[idx] = this.vx[lastIdx];
//       this.vy[idx] = this.vy[lastIdx];
//       this.hp[idx] = this.hp[lastIdx];
//       this.maxHp[idx] = this.maxHp[lastIdx];
//       this.team[idx] = this.team[lastIdx];
//       this.state[idx] = this.state[lastIdx];
      
//       this.dirtyIndices.add(idx);
//     }
    
//     this.count--;
//   }
  
//   setPosition(idx: number, x: number, y: number): void {
//     if (idx >= this.count) return;
    
//     this.x[idx] = x;
//     this.y[idx] = y;
//     this.dirtyIndices.add(idx);
//   }
  
//   setVelocity(idx: number, vx: number, vy: number): void {
//     if (idx >= this.count) return;
    
//     this.vx[idx] = vx;
//     this.vy[idx] = vy;
//     this.dirtyIndices.add(idx);
//   }
  
//   damage(idx: number, amount: number): void {
//     if (idx >= this.count) return;
    
//     this.hp[idx] = Math.max(0, this.hp[idx] - amount);
//     this.dirtyIndices.add(idx);
    
//     if (this.hp[idx] <= 0) {
//       this.state[idx] = 255; // dead state
//     }
//   }
  
//   clearDirty(): void {
//     this.dirtyIndices.clear();
//   }
  
//   getDirtyIndices(): number[] {
//     return Array.from(this.dirtyIndices);
//   }
  
//   private grow(): void {
//     const newCapacity = this.capacity * 2;
    
//     // Allocate new arrays
//     const newX = new Float32Array(newCapacity);
//     const newY = new Float32Array(newCapacity);
//     const newZ = new Float32Array(newCapacity);
//     const newVx = new Float32Array(newCapacity);
//     const newVy = new Float32Array(newCapacity);
//     const newHp = new Int16Array(newCapacity);
//     const newMaxHp = new Int16Array(newCapacity);
//     const newTeam = new Uint8Array(newCapacity);
//     const newState = new Uint8Array(newCapacity);
    
//     // Copy existing data
//     newX.set(this.x);
//     newY.set(this.y);
//     newZ.set(this.z);
//     newVx.set(this.vx);
//     newVy.set(this.vy);
//     newHp.set(this.hp);
//     newMaxHp.set(this.maxHp);
//     newTeam.set(this.team);
//     newState.set(this.state);
    
//     // Replace arrays
//     this.x = newX;
//     this.y = newY;
//     this.z = newZ;
//     this.vx = newVx;
//     this.vy = newVy;
//     this.hp = newHp;
//     this.maxHp = newMaxHp;
//     this.team = newTeam;
//     this.state = newState;
    
//     this.capacity = newCapacity;
//   }
// }

// /**
//  * Spatial hash for broad-phase collision detection
//  */
// export class SpatialHash {
//   private cellSize: number;
//   private cells: Map<string, Set<number>> = new Map();
  
//   constructor(cellSize: number = 4) {
//     this.cellSize = cellSize;
//   }
  
//   clear(): void {
//     this.cells.clear();
//   }
  
//   insert(idx: number, x: number, y: number): void {
//     const key = this.getKey(x, y);
    
//     if (!this.cells.has(key)) {
//       this.cells.set(key, new Set());
//     }
    
//     this.cells.get(key)!.add(idx);
//   }
  
//   query(x: number, y: number, radius: number = 1): number[] {
//     const results: Set<number> = new Set();
    
//     const minX = Math.floor((x - radius) / this.cellSize);
//     const maxX = Math.floor((x + radius) / this.cellSize);
//     const minY = Math.floor((y - radius) / this.cellSize);
//     const maxY = Math.floor((y + radius) / this.cellSize);
    
//     for (let cx = minX; cx <= maxX; cx++) {
//       for (let cy = minY; cy <= maxY; cy++) {
//         const key = `${cx},${cy}`;
//         const cell = this.cells.get(key);
        
//         if (cell) {
//           cell.forEach(idx => results.add(idx));
//         }
//       }
//     }
    
//     return Array.from(results);
//   }
  
//   private getKey(x: number, y: number): string {
//     const cx = Math.floor(x / this.cellSize);
//     const cy = Math.floor(y / this.cellSize);
//     return `${cx},${cy}`;
//   }
// }