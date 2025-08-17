import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

/**
 * ProjectileMotion - handles collision detection and damage events for projectiles
 * The actual movement is handled by ForcesCommand for performance
 */
export class ProjectileMotion extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const projectiles = context.getProjectiles();
    const arrays = context.getArrays();

    for (const projectile of projectiles) {
      const radiusSq = (projectile.radius || 1) * (projectile.radius || 1);
      
      if (projectile.type === "grapple") {
        // Check collision with any unit
        for (const idx of arrays.activeIndices) {
          if (arrays.hp[idx] <= 0) continue;
          
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < radiusSq) {
            this.commands.push({
              type: "meta",
              params: {
                unitId: arrays.unitIds[idx],
                meta: {
                  grappleHit: true,
                  grapplerID: projectile.sourceId || "unknown",
                  grappleOrigin: { ...projectile.pos },
                },
              },
            });

            this.commands.push({
              type: "removeProjectile",
              params: { id: projectile.id },
            });
            break;
          }
        }
      } else {
        // Check collision with enemy units
        const projectileTeam = projectile.team === "friendly" ? 0 : projectile.team === "hostile" ? 1 : 2;
        
        for (const idx of arrays.activeIndices) {
          if (arrays.team[idx] === projectileTeam || arrays.hp[idx] <= 0) continue;
          
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < radiusSq) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: arrays.unitIds[idx],
                  amount: projectile.damage || 10,
                  aspect: projectile.aspect || "physical",
                  origin: projectile.pos,
                },
              });

              this.commands.push({
                type: "removeProjectile",
                params: { id: projectile.id },
              });
              break;
          }
        }
      }

      if (
        projectile.type === "bomb" &&
        projectile.lifetime &&
        projectile.lifetime >= 30
      ) {
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionRadiusSq = explosionRadius * explosionRadius;
        const explosionDamage = projectile.damage || 20;
        const projectileTeam = projectile.team === "friendly" ? 0 : projectile.team === "hostile" ? 1 : 2;

        for (const idx of arrays.activeIndices) {
          if (arrays.team[idx] === projectileTeam) continue;
          
          const dx = arrays.posX[idx] - projectile.pos.x;
          const dy = arrays.posY[idx] - projectile.pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= explosionRadiusSq) {
            const distance = Math.sqrt(distSq);
              const damageMultiplier = Math.max(
                0.3,
                1 - (distance / explosionRadius) * 0.5,
              );
              const damage = Math.floor(explosionDamage * damageMultiplier);

              if (damage > 0) {
                this.commands.push({
                  type: "damage",
                  params: {
                    targetId: arrays.unitIds[idx],
                    amount: damage,
                    aspect: "explosion",
                  },
                });

                const knockbackForce = 2;
                const knockbackX =
                  dx !== 0 ? (dx / Math.abs(dx)) * knockbackForce : 0;
                const knockbackY =
                  dy !== 0 ? (dy / Math.abs(dy)) * knockbackForce : 0;

                this.commands.push({
                  type: "move",
                  params: {
                    unitId: arrays.unitIds[idx],
                    x: arrays.posX[idx] + knockbackX,
                    y: arrays.posY[idx] + knockbackY,
                  },
                });
              }
            }
          }

        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id },
        });
      }
    }
    return this.commands;
  }
}
