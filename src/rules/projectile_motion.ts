import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

/**
 * ProjectileMotion - handles collision detection and damage events for projectiles
 * The actual movement is handled by ForcesCommand for performance
 */
export class ProjectileMotion extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const projectiles = context.getProjectiles();
    
    // Early exit if no projectiles
    if (projectiles.length === 0) return this.commands;
    
    const arrays = context.getArrays();

    for (const projectile of projectiles) {
      const radiusSq = (projectile.radius || 1) * (projectile.radius || 1);

      if (projectile.type === "grapple") {
        const radius = projectile.radius || 1;
        for (const idx of arrays.activeIndices) {
          if (arrays.hp[idx] <= 0) continue;

          // Quick Manhattan distance check first
          const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
          const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
          if (absDx > radius || absDy > radius) continue;

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
        const projectileTeam =
          projectile.team === "friendly"
            ? 0
            : projectile.team === "hostile"
              ? 1
              : 2;

        for (const idx of arrays.activeIndices) {
          if (arrays.team[idx] === projectileTeam || arrays.hp[idx] <= 0)
            continue;

          // Quick Manhattan distance check first (cheaper than Euclidean)
          const absDx = Math.abs(arrays.posX[idx] - projectile.pos.x);
          const absDy = Math.abs(arrays.posY[idx] - projectile.pos.y);
          const radius = projectile.radius || 1;
          if (absDx > radius || absDy > radius) continue;

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
        ((projectile.target &&
          projectile.progress !== undefined &&
          projectile.duration !== undefined &&
          projectile.progress >= projectile.duration) ||
          (projectile.lifetime && projectile.lifetime >= 30))
      ) {
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionRadiusSq = explosionRadius * explosionRadius;
        const explosionDamage = projectile.damage || 20;
        const projectileTeam =
          projectile.team === "friendly"
            ? 0
            : projectile.team === "hostile"
              ? 1
              : 2;

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

  private executeWithSpatialIndex(context: TickContext, projectiles: any[]): QueuedCommand[] {
    this.commands = [];
    
    for (const projectile of projectiles) {
      const radius = projectile.radius || 1;
      
      // Use spatial index to find nearby units
      const nearbyUnits = context.findUnitsInRadius(projectile.pos, radius + 0.5);
      
      if (projectile.type === "grapple") {
        for (const unit of nearbyUnits) {
          if (unit.hp <= 0) continue;
          
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = radius * radius;
          
          if (distSq < radiusSq) {
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
      } else {
        // Regular projectile collision
        for (const unit of nearbyUnits) {
          if (unit.hp <= 0) continue;
          if (unit.team === projectile.team) continue;
          
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = radius * radius;
          
          if (distSq < radiusSq) {
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
      
      // Handle bomb explosions
      if (
        projectile.type === "bomb" &&
        ((projectile.target &&
          projectile.progress !== undefined &&
          projectile.duration !== undefined &&
          projectile.progress >= projectile.duration) ||
          (projectile.lifetime && projectile.lifetime >= 30))
      ) {
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionDamage = projectile.damage || 20;
        
        // Use spatial index for explosion area
        const affectedUnits = context.findUnitsInRadius(projectile.pos, explosionRadius);
        
        for (const unit of affectedUnits) {
          if (unit.team === projectile.team) continue;
          
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
              const knockbackX = dx !== 0 ? (dx / Math.abs(dx)) * knockbackForce : 0;
              const knockbackY = dy !== 0 ? (dy / Math.abs(dy)) * knockbackForce : 0;
              
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
        
        this.commands.push({
          type: "removeProjectile",
          params: { id: projectile.id },
        });
      }
    }
    
    return this.commands;
  }
}
