import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Physics rule - handles projectile movement
 * This runs during the rule phase to update projectile positions
 */
export class Physics extends Rule {
  private sim: any;

  constructor(sim: any) {
    super();
    this.sim = sim;
  }

  execute(_context: TickContext): QueuedCommand[] {
    this.updateProjectiles();
    return [];
  }

  private updateProjectiles(): void {
    const projectileArrays = this.sim.projectileArrays;
    if (!projectileArrays || projectileArrays.activeCount === 0) return;

    const toRemove: number[] = [];
    const maxLifetime = 60; // Bullets live for max 60 ticks

    for (let i = 0; i < projectileArrays.capacity; i++) {
      if (projectileArrays.active[i] === 0) continue;

      // Update position
      projectileArrays.posX[i] += projectileArrays.velX[i];
      projectileArrays.posY[i] += projectileArrays.velY[i];

      // Update lifetime
      projectileArrays.lifetime[i]++;

      // Type-specific updates
      const projType = projectileArrays.type[i];
      if (projType === 1) {
        // bomb
        if (!projectileArrays.targetIds[i]) {
          projectileArrays.velY[i] += 0.2; // gravity
        }
        if (projectileArrays.duration[i] > 0) {
          projectileArrays.progress[i]++;
        }
      }

      // Check for removal conditions
      const shouldRemove =
        // Out of bounds
        projectileArrays.posX[i] < 0 ||
        projectileArrays.posX[i] >= this.sim.fieldWidth ||
        projectileArrays.posY[i] < 0 ||
        projectileArrays.posY[i] >= this.sim.fieldHeight ||
        // Lifetime exceeded (bullets only, bombs handled in ProjectileMotion)
        (projType === 0 && projectileArrays.lifetime[i] >= maxLifetime);

      if (shouldRemove) {
        toRemove.push(i);
      }
    }

    // Remove projectiles
    for (const idx of toRemove) {
      projectileArrays.removeProjectile(idx);
    }

    // Invalidate cache if we removed anything
    if (toRemove.length > 0) {
      this.sim.invalidateProjectilesCache();
    }
  }
}
