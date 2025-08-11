import { Simulator } from "../core/simulator";

interface Interpolation {
  startX: number;
  startY: number;
  startZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number; // 0 to 1
  duration: number; // in milliseconds
}

export default class View {
  constructor(
    protected ctx: CanvasRenderingContext2D,
    public sim: Simulator,
    public width: number, public height: number,
    public sprites: Map<string, HTMLImageElement>,
    public backgrounds: Map<string, HTMLImageElement> = new Map()
  ) { }

  show(): void {
    throw new Error("Method 'show' must be implemented in subclass " + this.constructor.name);
  }

  protected unitInterpolations: Map<string, Interpolation> = new Map();
  protected projectileInterpolations: Map<string, Interpolation> = new Map();
  protected previousPositions: Map<string, {x: number, y: number, z: number}> = new Map();
  protected previousProjectilePositions: Map<string, {x: number, y: number, z: number}> = new Map();
  protected animationTime: number = 0; // For smooth animations

  protected updateMovementInterpolations() {
    const deltaTime = 16; // ~16ms per frame at 60fps
    
    // Update animation time
    this.animationTime += deltaTime;
    
    // Check for new movements
    for (const unit of this.sim.units) {
      const prevPos = this.previousPositions.get(unit.id);
      const currentZ = unit.meta?.z || 0;
      if (!prevPos) {
        // First time seeing this unit, just record position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y, z: currentZ });
        continue;
      }
      
      // Check if unit moved or z changed
      if (prevPos.x !== unit.pos.x || prevPos.y !== unit.pos.y || prevPos.z !== currentZ) {
        // Unit moved or jumped! Start interpolation
        this.unitInterpolations.set(unit.id, {
          startX: prevPos.x,
          startY: prevPos.y,
          startZ: prevPos.z,
          targetX: unit.pos.x,
          targetY: unit.pos.y,
          targetZ: currentZ,
          progress: 0,
          duration: 400 // 400ms movement (slower)
        });
        
        // Update previous position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y, z: currentZ });
      }
    }
    
    let entries = Array.from(this.unitInterpolations.entries());
    for (const [unitId, interp] of entries) {
      interp.progress += deltaTime / interp.duration;
      
      if (interp.progress >= 1) {
        this.unitInterpolations.delete(unitId);
      }
    }
  }

  protected updateProjectileInterpolations() {
    const deltaTime = 16; // ~16ms per frame at 60fps
    
    for (const projectile of this.sim.projectiles) {
      const prevPos = this.previousProjectilePositions.get(projectile.id);
      const currentZ = projectile.z || 0;
      
      if (!prevPos) {
        this.previousProjectilePositions.set(projectile.id, { 
          x: projectile.pos.x, 
          y: projectile.pos.y, 
          z: currentZ 
        });
        continue;
      }
      
      // Check if projectile moved or z changed
      if (prevPos.x !== projectile.pos.x || prevPos.y !== projectile.pos.y || prevPos.z !== currentZ) {
        // Projectile moved! Start interpolation
        // Use longer duration for more visible smoothing
        const duration = projectile.type === 'bomb' ? 400 : 200; // Much longer durations
        
        this.projectileInterpolations.set(projectile.id, {
          startX: prevPos.x,
          startY: prevPos.y,
          startZ: prevPos.z,
          targetX: projectile.pos.x,
          targetY: projectile.pos.y,
          targetZ: currentZ,
          progress: 0,
          duration
        });
        
        // Update previous position
        this.previousProjectilePositions.set(projectile.id, { 
          x: projectile.pos.x, 
          y: projectile.pos.y, 
          z: currentZ 
        });
      }
    }
    
    // Clean up interpolations for removed projectiles
    const activeProjectileIds = new Set(this.sim.projectiles.map(p => p.id));
    const keys = Array.from(this.projectileInterpolations.keys());
    for (const key of keys) {
      if (!activeProjectileIds.has(key)) {
        this.projectileInterpolations.delete(key);
        this.previousProjectilePositions.delete(key);
      }
    }
    
    // Update existing interpolations
    const entries = Array.from(this.projectileInterpolations.entries());
    for (const [projectileId, interp] of entries) {
      interp.progress += deltaTime / interp.duration;
      
      if (interp.progress >= 1) {
        // Interpolation complete, remove it
        this.projectileInterpolations.delete(projectileId);
      }
    }
  }


}