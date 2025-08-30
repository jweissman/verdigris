import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Projectile command - creates or removes projectiles
 * Params for create (default):
 *   x: number - Starting X position
 *   y: number - Starting Y position
 *   projectileType: string - Type of projectile (bullet, bomb, etc.)
 *   damage?: number - Damage amount
 *   targetX?: number - Target X position
 *   targetY?: number - Target Y position
 *   radius?: number - Projectile radius
 *   team?: string - Team affiliation
 *
 * Params for remove:
 *   operation: "remove"
 *   id: string - Projectile ID to remove
 */
export class Projectile extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const operation = params.operation as string | undefined;

    // Handle different operations
    switch (operation) {
      case "remove":
      case "rm":
        return this.removeProjectile(params);

      case "update":
      case "up":
        return this.updateProjectile(params);

      case "batch":
        return this.batchProjectiles(unitId, params);

      default:
        // Backwards compat: if id provided without operation, assume remove
        if (params.id && !params.x) {
          return this.removeProjectile(params);
        }
        // Otherwise create
        const x = params.x as number;
        const y = params.y as number;
        const projectileType = (params.projectileType as string) || "bullet";
        const damage = (params.damage as number) || 0;
        const targetX = params.targetX as number | undefined;
        const targetY = params.targetY as number | undefined;
        const radius = (params.radius as number) || 1;
        const team = params.team as string | undefined;
        const initialZ = params.z as number | undefined;

        const startPos = { x, y };
        const caster = unitId
          ? this.sim.units.find((u) => u.id === unitId)
          : null;
        const projectileTeam = team || caster?.team || "neutral";

        const projectile: any = {
          id: `projectile_${unitId}_${Date.now()}_${Simulator.rng.random().toString(36).substr(2, 9)}`,
          pos: startPos,
          vel: { x: 0, y: 0 },
          radius: radius,
          damage: damage,
          team: projectileTeam,
          type: projectileType,
          sourceId: unitId, // Track who fired this projectile
          aspect: projectileType === "laser_beam" ? "laser" : "physical",
        };

        if (targetX !== undefined && targetY !== undefined) {
          const targetPos = { x: targetX, y: targetY };

          if (projectileType === "bomb") {
            projectile.target = targetPos;
            projectile.origin = startPos;
            projectile.progress = 0;
            projectile.duration = 6; // Shorter duration for bombs (reverting)
            projectile.z = initialZ !== undefined ? initialZ : 0; // Use provided z or default to 0
            projectile.aoeRadius = 3; // Default AoE radius for bombs
          } else {
            const dx = targetPos.x - startPos.x;
            const dy = targetPos.y - startPos.y;
            const mag = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 2; // Default bullet speed
            projectile.vel = { x: (dx / mag) * speed, y: (dy / mag) * speed };
          }
        } else {
          projectile.vel = { x: 1, y: 0 };
        }

        // Use Transform to add projectile
        if (this.sim.projectileArrays) {
          this.sim.getTransform().addProjectile({
            id: projectile.id,
            pos: projectile.pos,
            vel: projectile.vel,
            radius: projectile.radius,
            damage: projectile.damage,
            team: projectile.team as "friendly" | "hostile" | "neutral",
            type: projectile.type as
              | "bullet"
              | "bomb"
              | "grapple"
              | "laser_beam",
            sourceId: projectile.sourceId,
            target: projectile.target,
            progress: projectile.progress,
            duration: projectile.duration,
            origin: projectile.origin,
            z: projectile.z,
            lifetime: projectile.lifetime,
            aoeRadius: projectile.aoeRadius,
            explosionRadius: projectile.explosionRadius || 3,
            aspect: projectile.aspect,
          });
        }
    }
  }

  private removeProjectile(params: CommandParams): void {
    const id = params.id as string;
    if (!id) {
      console.warn("projectile rm: missing id");
      return;
    }

    if (this.sim.projectileArrays) {
      this.sim.getTransform().removeProjectileById(id);
    }
  }

  private updateProjectile(params: CommandParams): void {
    const id = params.id as string;
    if (!id) {
      console.warn("projectile up: missing id");
      return;
    }

    if (this.sim.projectileArrays) {
      const arrays = this.sim.projectileArrays;
      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.projectileIds[i] === id && arrays.active[i] === 1) {
          if (params.x !== undefined) arrays.posX[i] = params.x as number;
          if (params.y !== undefined) arrays.posY[i] = params.y as number;
          if (params.vx !== undefined) arrays.velX[i] = params.vx as number;
          if (params.vy !== undefined) arrays.velY[i] = params.vy as number;
          this.sim.invalidateProjectilesCache();
          break;
        }
      }
    }
  }

  private batchProjectiles(unitId: string | null, params: CommandParams): void {
    const projectiles = params.projectiles as any[];
    if (!projectiles || !Array.isArray(projectiles)) {
      console.warn("projectile batch: invalid array");
      return;
    }

    for (const proj of projectiles) {
      this.execute(unitId, proj);
    }
  }
}
