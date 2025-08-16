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
    const units = context.getAllUnits();

    for (const projectile of projectiles) {
      if (projectile.type === "grapple") {
        for (const unit of units) {
          if (unit.hp > 0) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (projectile.radius || 1)) {
              this.commands.push({
                type: "meta",
                params: {
                  unitId: unit.id,
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
        }
      } else {
        for (const unit of units) {
          if (unit.team !== projectile.team && unit.hp > 0) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionRadius =
              projectile.radius !== undefined ? projectile.radius : 1;

            if (distance < collisionRadius) {
              this.commands.push({
                type: "damage",
                params: {
                  targetId: unit.id,
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
      }

      if (
        projectile.type === "bomb" &&
        projectile.lifetime &&
        projectile.lifetime >= 30
      ) {
        const units = context.getAllUnits();
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionDamage = projectile.damage || 20;

        for (const unit of units) {
          if (unit.team !== projectile.team) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= explosionRadius) {
              const damageMultiplier = Math.max(
                0.3,
                1 - (distance / explosionRadius) * 0.5,
              );
              const damage = Math.floor(explosionDamage * damageMultiplier);

              if (damage > 0) {
                this.commands.push({
                  type: "damage",
                  params: {
                    targetId: unit.id,
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
                    unitId: unit.id,
                    x: unit.pos.x + knockbackX,
                    y: unit.pos.y + knockbackY,
                  },
                });
              }
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
