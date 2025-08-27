/**
 * Structure of Arrays (SoA) storage for projectiles
 * Uses typed arrays for cache-friendly access and SIMD-like vectorized operations
 */
export class ProjectileArrays {
  public readonly capacity: number;
  public activeCount: number = 0;
  public activeIndices: number[] = []; // Track active projectile indices
  
  // Core projectile data
  public readonly projectileIds: string[];
  public readonly posX: Float32Array;
  public readonly posY: Float32Array;
  public readonly velX: Float32Array;
  public readonly velY: Float32Array;
  public readonly radius: Float32Array;
  public readonly damage: Float32Array;
  
  // Projectile properties
  public readonly team: Uint8Array; // 0 = neutral, 1 = friendly, 2 = hostile
  public readonly type: Uint8Array; // 0 = bullet, 1 = bomb, 2 = grapple, 3 = laser_beam
  public readonly active: Uint8Array; // 0 = inactive, 1 = active
  
  // Optional properties (for specific projectile types)
  public readonly sourceIds: string[];
  public readonly targetX: Float32Array;
  public readonly targetY: Float32Array;
  public readonly progress: Float32Array;
  public readonly duration: Float32Array;
  public readonly originX: Float32Array;
  public readonly originY: Float32Array;
  public readonly z: Float32Array;
  public readonly lifetime: Int16Array;
  public readonly aoeRadius: Float32Array;
  public readonly explosionRadius: Float32Array;
  public readonly aspect: string[];
  
  private freeIndices: number[] = [];
  
  constructor(capacity: number = 2000) {
    this.capacity = capacity;
    
    // Initialize arrays
    this.projectileIds = new Array(capacity).fill("");
    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.velX = new Float32Array(capacity);
    this.velY = new Float32Array(capacity);
    this.radius = new Float32Array(capacity).fill(1);
    this.damage = new Float32Array(capacity).fill(10);
    
    this.team = new Uint8Array(capacity);
    this.type = new Uint8Array(capacity);
    this.active = new Uint8Array(capacity);
    
    this.sourceIds = new Array(capacity).fill("");
    this.targetX = new Float32Array(capacity);
    this.targetY = new Float32Array(capacity);
    this.progress = new Float32Array(capacity);
    this.duration = new Float32Array(capacity);
    this.originX = new Float32Array(capacity);
    this.originY = new Float32Array(capacity);
    this.z = new Float32Array(capacity);
    this.lifetime = new Int16Array(capacity);
    this.aoeRadius = new Float32Array(capacity);
    this.explosionRadius = new Float32Array(capacity).fill(3);
    this.aspect = new Array(capacity).fill("physical");
    
    // Initialize free indices pool
    for (let i = capacity - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
  
  /**
   * Add a projectile and return its index
   */
  addProjectile(projectile: {
    id: string;
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    radius: number;
    damage: number;
    team: "friendly" | "hostile" | "neutral";
    type: "bullet" | "bomb" | "grapple" | "laser_beam";
    sourceId?: string;
    target?: { x: number; y: number };
    progress?: number;
    duration?: number;
    origin?: { x: number; y: number };
    z?: number;
    lifetime?: number;
    aoeRadius?: number;
    explosionRadius?: number;
    aspect?: string;
  }): number {
    if (this.freeIndices.length === 0) {
      // Silently fail when capacity exceeded - projectiles will just not spawn
      return -1;
    }
    
    const index = this.freeIndices.pop()!;
    
    this.projectileIds[index] = projectile.id;
    this.posX[index] = projectile.pos.x;
    this.posY[index] = projectile.pos.y;
    this.velX[index] = projectile.vel.x;
    this.velY[index] = projectile.vel.y;
    this.radius[index] = projectile.radius;
    this.damage[index] = projectile.damage;
    
    this.team[index] = projectile.team === "friendly" ? 1 : projectile.team === "hostile" ? 2 : 0;
    this.type[index] = this.getTypeId(projectile.type);
    this.active[index] = 1;
    
    this.sourceIds[index] = projectile.sourceId || "";
    
    if (projectile.target) {
      this.targetX[index] = projectile.target.x;
      this.targetY[index] = projectile.target.y;
    }
    
    this.progress[index] = projectile.progress || 0;
    this.duration[index] = projectile.duration || 0;
    
    if (projectile.origin) {
      this.originX[index] = projectile.origin.x;
      this.originY[index] = projectile.origin.y;
    }
    
    this.z[index] = projectile.z || 0;
    this.lifetime[index] = projectile.lifetime || 0;
    this.aoeRadius[index] = projectile.aoeRadius || 0;
    this.explosionRadius[index] = projectile.explosionRadius || 3;
    this.aspect[index] = projectile.aspect || "physical";
    
    this.activeCount++;
    this.activeIndices.push(index);
    return index;
  }
  
  /**
   * Remove a projectile by index
   */
  removeProjectile(index: number): void {
    if (this.active[index] === 0) return;
    
    this.active[index] = 0;
    this.projectileIds[index] = "";
    this.sourceIds[index] = "";
    this.aspect[index] = "physical";
    this.freeIndices.push(index);
    this.activeCount--;
    
    // Remove from activeIndices
    const activeIdx = this.activeIndices.indexOf(index);
    if (activeIdx !== -1) {
      this.activeIndices.splice(activeIdx, 1);
    }
  }
  
  /**
   * Remove projectile by ID (less efficient, use index when possible)
   */
  removeProjectileById(id: string): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 1 && this.projectileIds[i] === id) {
        this.removeProjectile(i);
        return;
      }
    }
  }
  
  /**
   * Update projectile physics in a vectorized loop
   * Returns indices of projectiles that went out of bounds
   */
  updatePhysics(fieldWidth: number, fieldHeight: number, deltaTime: number = 1): number[] {
    const outOfBounds: number[] = [];
    
    // Vectorized physics update
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      
      // Update position
      this.posX[i] += this.velX[i] * deltaTime;
      this.posY[i] += this.velY[i] * deltaTime;
      
      // Apply gravity to bombs
      if (this.type[i] === 1) { // bomb type
        this.velY[i] += 0.2 * deltaTime;
        this.lifetime[i] += 1;
      }
      
      // Update progress for targeted projectiles
      if (this.duration[i] > 0) {
        this.progress[i] += deltaTime;
      }
      
      // Check bounds
      if (this.posX[i] < 0 || this.posX[i] >= fieldWidth ||
          this.posY[i] < 0 || this.posY[i] >= fieldHeight) {
        outOfBounds.push(i);
      }
    }
    
    return outOfBounds;
  }
  
  /**
   * Get active projectile indices for iteration
   */
  getActiveIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 1) {
        indices.push(i);
      }
    }
    return indices;
  }
  
  /**
   * Convert old projectile format to SoA index
   */
  migrateFromObject(projectile: any): number {
    return this.addProjectile({
      id: projectile.id,
      pos: projectile.pos,
      vel: projectile.vel,
      radius: projectile.radius || 1,
      damage: projectile.damage || 10,
      team: projectile.team || "neutral",
      type: projectile.type || "bullet",
      sourceId: projectile.sourceId,
      target: projectile.target,
      progress: projectile.progress,
      duration: projectile.duration,
      origin: projectile.origin,
      z: projectile.z,
      lifetime: projectile.lifetime,
      aoeRadius: projectile.aoeRadius,
      explosionRadius: projectile.explosionRadius,
      aspect: projectile.aspect,
    });
  }
  
  /**
   * Get projectile type ID from string
   */
  private getTypeId(type: "bullet" | "bomb" | "grapple" | "laser_beam"): number {
    const types = {
      bullet: 0,
      bomb: 1,
      grapple: 2,
      laser_beam: 3,
    };
    return types[type] || 0;
  }
  
  /**
   * Clear all projectiles
   */
  clear(): void {
    this.active.fill(0);
    this.activeCount = 0;
    this.activeIndices = [];
    this.freeIndices = [];
    for (let i = this.capacity - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }
}