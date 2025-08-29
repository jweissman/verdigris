import { ProjectileArrays } from "../sim/projectile_arrays";
import { Projectile } from "../types/Projectile";

/**
 * Manages projectile lifecycle and physics
 * Extracted from Simulator to reduce complexity
 */
export class ProjectileManager {
  public projectileArrays: ProjectileArrays;
  private _projectilesCache: Projectile[] = [];
  private _projectilesCacheDirty: boolean = true;

  constructor(capacity: number = 2000) {
    this.projectileArrays = new ProjectileArrays(capacity);
  }

  get projectiles(): Projectile[] {
    if (this._projectilesCacheDirty) {
      this._projectilesCache = [];
      const arrays = this.projectileArrays;
      
      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.active[i] === 0) continue;
        
        const teamName = arrays.team[i] === 1 ? "friendly" : arrays.team[i] === 2 ? "hostile" : "neutral";
        const typeName = ["bullet", "bomb", "grapple", "laser_beam"][arrays.type[i]] || "bullet";
        
        const proj: Projectile = {
          id: arrays.projectileIds[i],
          pos: { x: arrays.posX[i], y: arrays.posY[i] },
          vel: { x: arrays.velX[i], y: arrays.velY[i] },
          radius: arrays.radius[i],
          damage: arrays.damage[i],
          team: teamName as "friendly" | "hostile" | "neutral",
          type: typeName as "bullet" | "bomb" | "grapple" | "laser_beam",
        };
        
        if (arrays.sourceIds[i]) proj.sourceId = arrays.sourceIds[i];
        
        // Add optional fields based on projectile type
        if (arrays.type[i] === 1 || arrays.type[i] === 2) { // bomb or grapple have targets
          proj.target = { x: arrays.targetX[i], y: arrays.targetY[i] };
        }
        if (arrays.type[i] === 1) { // bomb has origin
          proj.origin = { x: arrays.originX[i], y: arrays.originY[i] };
        }
        if (arrays.progress[i] > 0) proj.progress = arrays.progress[i];
        if (arrays.duration[i] > 0) proj.duration = arrays.duration[i];
        if (arrays.type[i] === 1) { // bombs have these fields
          proj.z = arrays.z[i];
          proj.aoeRadius = arrays.aoeRadius[i] || 3; // Default for bombs
        }
        if (arrays.lifetime[i] > 0) proj.lifetime = arrays.lifetime[i];
        if (arrays.explosionRadius[i] !== 3) proj.explosionRadius = arrays.explosionRadius[i];
        if (arrays.aspect[i] && arrays.aspect[i] !== "physical") proj.aspect = arrays.aspect[i];
        
        this._projectilesCache.push(proj);
      }
      this._projectilesCacheDirty = false;
    }
    return this._projectilesCache;
  }

  set projectiles(projectiles: Projectile[]) {
    // Clear and repopulate SoA arrays
    this.projectileArrays.clear();
    for (const p of projectiles) {
      this.projectileArrays.addProjectile(p);
    }
    this._projectilesCacheDirty = true;
  }

  invalidateCache(): void {
    this._projectilesCacheDirty = true;
  }

  addProjectile(projectile: Projectile): void {
    this.projectileArrays.addProjectile(projectile);
    this._projectilesCacheDirty = true;
  }

  removeProjectile(index: number): void {
    this.projectileArrays.removeProjectile(index);
    this._projectilesCacheDirty = true;
  }

  updatePhysics(fieldWidth: number, fieldHeight: number, deltaTime: number = 1): number[] {
    const outOfBounds = this.projectileArrays.updatePhysics(fieldWidth, fieldHeight, deltaTime);
    if (outOfBounds.length > 0) {
      this._projectilesCacheDirty = true;
    }
    return outOfBounds;
  }

  clear(): void {
    this.projectileArrays.clear();
    this._projectilesCache = [];
    this._projectilesCacheDirty = true;
  }

  get activeCount(): number {
    return this.projectileArrays.activeCount;
  }

  getActiveIndices(): number[] {
    return this.projectileArrays.getActiveIndices();
  }
}