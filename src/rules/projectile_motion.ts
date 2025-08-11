import { Rule } from "./rule";
import { Projectile } from "../types/Projectile";

export class ProjectileMotion extends Rule {
  apply = () => {
    this.sim.projectiles = this.sim.projectiles.map(proj => {
      if (proj.type === 'bullet') {
        return this.updateBullet(proj);
      } else if (proj.type === 'bomb') {
        return this.updateBomb(proj);
      }
      // Fallback to old behavior for backwards compatibility
      return {
        ...proj,
        pos: {
          x: proj.pos.x + proj.vel.x,
          y: proj.pos.y + proj.vel.y
        }
      };
    }).filter(proj => {
      // Remove projectiles that are out of bounds or completed
      if (proj.type === 'bullet') {
        return proj.pos.x >= 0 && proj.pos.x < this.sim.fieldWidth &&
          proj.pos.y >= 0 && proj.pos.y < this.sim.fieldHeight;
      } else if (proj.type === 'bomb') {
        return (proj.progress || 0) <= (proj.duration || 12);
      } else if (proj.type === 'grapple') {
        // Grapple projectiles are handled by GrapplingPhysics rule
        return true;
      }
      return true; // Keep other projectiles by default
    });
  }

  private updateBullet(proj: Projectile): Projectile {
    // Simple linear motion for bullets
    return {
      ...proj,
      pos: {
        x: proj.pos.x + proj.vel.x,
        y: proj.pos.y + proj.vel.y
      }
    };
  }

  private updateBomb(proj: Projectile): Projectile {
    if (!proj.target || !proj.origin || proj.duration === undefined) {
      console.warn(`Bomb projectile ${proj.id} missing required fields`);
      return proj;
    }

    const progress = (proj.progress || 0) + 1;
    const duration = proj.duration;
    const t = progress / duration; // 0 to 1

    if (progress > duration) {
      if (proj.aoeRadius && proj.aoeRadius > 0) {
        // NOTE: we should be able to get the source unit ID _more directly than this_
        const sourceUnitId = proj.id.split('_')[1] || 'unknown';

        this.sim.queuedEvents.push({
          kind: 'aoe',
          source: sourceUnitId,
          target: proj.target,
          meta: {
            aspect: 'impact',
            amount: proj.damage,
            radius: proj.aoeRadius,
            origin: proj.target
          }
        });

      }

      return {
        ...proj,
        pos: { ...proj.target },
        progress: duration + 1,
        z: 0
      };
    }

    // Arc motion interpolation (same as jumping)
    const dx = proj.target.x - proj.origin.x;
    const dy = proj.target.y - proj.origin.y;

    const x = proj.origin.x + dx * t;
    const y = proj.origin.y + dy * t;

    // Parabolic arc for z-axis (height peaks at middle of flight)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12; // Increased base height for more dramatic arcs
    const distanceMultiplier = Math.min(2, distance / 5); // Scale with distance
    const height = baseHeight * distanceMultiplier;
    const z = height * Math.sin(Math.PI * t);

    return {
      ...proj,
      pos: { x, y },
      progress,
      z
    };
  }
}
