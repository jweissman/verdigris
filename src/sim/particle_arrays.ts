/**
 * Structure of Arrays (SoA) storage for particles
 * Uses typed arrays for cache-friendly access and potential SIMD optimization
 */
export class ParticleArrays {
  // Maximum particles we can store
  public readonly capacity: number;
  
  // Active particle count
  public activeCount: number = 0;
  
  // Particle IDs (for tracking)
  public readonly particleIds: string[];
  
  // HOT DATA - accessed every frame
  public readonly posX: Float32Array;
  public readonly posY: Float32Array;
  public readonly velX: Float32Array;
  public readonly velY: Float32Array;
  public readonly lifetime: Int16Array;
  public readonly active: Uint8Array; // 0 = inactive, 1 = active
  
  // WARM DATA - accessed sometimes
  public readonly radius: Float32Array;
  public readonly z: Float32Array; // height for 3D effects
  public readonly type: Uint8Array; // particle type enum
  public readonly landed: Uint8Array; // 0 = airborne, 1 = landed
  
  // COLD DATA - rarely accessed
  public readonly color: string[];
  public readonly targetCellX: Float32Array;
  public readonly targetCellY: Float32Array;
  
  // Free list for allocation
  private freeIndices: number[] = [];
  
  constructor(capacity: number = 1000) {
    this.capacity = capacity;
    
    // Initialize arrays
    this.particleIds = new Array(capacity).fill('');
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.lifetime = new Int16Array(capacity);
    this.active = new Uint8Array(capacity);
    this.radius = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.type = new Uint8Array(capacity);
    this.landed = new Uint8Array(capacity);
    this.color = new Array(capacity).fill('#FFFFFF');
    this.targetCellX = new Float32Array(capacity);
    this.targetCellY = new Float32Array(capacity);
    
    // Initialize free list
    for (let i = capacity - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
  
  /**
   * Add a particle and return its index
   */
  addParticle(particle: {
    id?: string;
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    lifetime: number;
    radius?: number;
    z?: number;
    type?: string;
    landed?: boolean;
    color?: string;
    targetCell?: { x: number; y: number };
  }): number {
    if (this.freeIndices.length === 0) {
      console.warn('ParticleArrays: No free slots!');
      return -1;
    }
    
    const index = this.freeIndices.pop()!;
    
    
    // Store particle data
    this.particleIds[index] = particle.id || `p_${Date.now()}_${index}`;
    this.posX[index] = particle.pos.x;
    this.posY[index] = particle.pos.y;
    this.velX[index] = particle.vel.x;
    this.velY[index] = particle.vel.y;
    this.lifetime[index] = particle.lifetime;
    this.active[index] = 1;
    this.radius[index] = particle.radius || 0.25;
    this.z[index] = particle.z || 0;
    this.type[index] = this.getTypeId(particle.type);
    this.landed[index] = particle.landed ? 1 : 0;
    this.color[index] = particle.color || '#FFFFFF';
    
    if (particle.targetCell) {
      this.targetCellX[index] = particle.targetCell.x;
      this.targetCellY[index] = particle.targetCell.y;
    }
    
    this.activeCount++;
    return index;
  }
  
  /**
   * Remove a particle by index
   */
  removeParticle(index: number): void {
    if (this.active[index] === 0) return;
    
    this.active[index] = 0;
    this.particleIds[index] = '';
    this.freeIndices.push(index);
    this.activeCount--;
  }
  
  /**
   * Update all particles in a vectorized loop
   * This is where the performance gain comes from!
   */
  updatePhysics(deltaTime: number = 1): void {
    const count = this.capacity;
    
    // PURE VECTORIZED LOOP - can be SIMD optimized!
    for (let i = 0; i < count; i++) {
      // Branchless update using active mask
      const isActive = this.active[i];
      
      // Update position (branch-free)
      this.posX[i] += this.velX[i] * isActive * deltaTime;
      this.posY[i] += this.velY[i] * isActive * deltaTime;
      
      // Update lifetime
      this.lifetime[i] -= isActive;
      
      // Deactivate if lifetime expired (branch-free)
      this.active[i] *= (this.lifetime[i] > 0) ? 1 : 0;
    }
  }
  
  /**
   * Apply gravity to airborne particles
   */
  applyGravity(gravity: number = 0.1): void {
    const count = this.capacity;
    
    // Vectorized gravity application
    for (let i = 0; i < count; i++) {
      // Only apply to active, non-landed particles
      const shouldApply = this.active[i] * (1 - this.landed[i]);
      this.velY[i] += gravity * shouldApply;
    }
  }
  
  /**
   * Get particle type ID from string
   */
  private getTypeId(type?: string): number {
    const types: Record<string, number> = {
      'leaf': 1,
      'rain': 2,
      'snow': 3,
      'debris': 4,
      'lightning': 5,
      'sand': 6,
      'energy': 7,
      'magic': 8,
      'grapple_line': 9,
      'test_particle': 10,
      'test': 11,
      'pin': 12,
      'storm_cloud': 13,
      'lightning_branch': 14,
      'electric_spark': 15,
      'power_surge': 16,
      'ground_burst': 17,
      'entangle': 18,
      'tame': 19,
      'calm': 20,
      'heal': 21
    };
    return types[type || ''] || 0;
  }
  
  /**
   * Clear all particles
   */
  clear(): void {
    this.active.fill(0);
    this.activeCount = 0;
    this.freeIndices = [];
    for (let i = this.capacity - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
}