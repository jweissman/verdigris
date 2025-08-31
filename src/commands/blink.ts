import { Command, CommandParams } from "../rules/command";

/**
 * Blink command - Instant teleportation to target location
 * Params:
 *   distance?: number - Max blink distance (default 10)
 *   targetX?: number - Specific X target (optional)
 *   targetY?: number - Specific Y target (optional)
 *   damage?: number - Damage on arrival (default 0)
 *   radius?: number - AOE radius on arrival (default 0)
 *   invulnerable?: boolean - Brief invulnerability after blink (default true)
 */
export class Blink extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;

    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit) return;

    const maxDistance = (params.distance as number) || 10;
    const damage = (params.damage as number) || 0;
    const radius = (params.radius as number) || 0;
    const invulnerable = params.invulnerable !== false;

    // Check if blink is on cooldown
    const lastBlink = unit.meta?.lastBlinkTime;
    const blinkCooldown = 60; // 60 ticks cooldown (longer than dash)
    if (lastBlink !== undefined && this.sim.ticks - lastBlink < blinkCooldown) {
      console.log("[Blink] Blink on cooldown");
      return;
    }

    let targetX: number;
    let targetY: number;

    // Use specific target if provided
    if (params.targetX !== undefined && params.targetY !== undefined) {
      targetX = params.targetX as number;
      targetY = params.targetY as number;
    } else {
      // Auto-target: blink behind nearest enemy or forward
      const enemies = this.sim.units.filter(
        (u) =>
          u.team !== unit.team &&
          u.hp > 0 &&
          Math.abs(u.pos.x - unit.pos.x) <= maxDistance &&
          Math.abs(u.pos.y - unit.pos.y) <= 3,
      );

      if (enemies.length > 0) {
        // Find nearest enemy
        enemies.sort((a, b) => {
          const distA =
            Math.abs(a.pos.x - unit.pos.x) + Math.abs(a.pos.y - unit.pos.y);
          const distB =
            Math.abs(b.pos.x - unit.pos.x) + Math.abs(b.pos.y - unit.pos.y);
          return distA - distB;
        });

        const target = enemies[0];
        // Blink behind the enemy
        const facing = target.pos.x > unit.pos.x ? 1 : -1;
        targetX = target.pos.x + facing * 2;
        targetY = target.pos.y;
      } else {
        // No enemies - blink forward in facing direction
        const facing = unit.meta?.facing || "right";
        targetX =
          unit.pos.x + (facing === "right" ? maxDistance : -maxDistance);
        targetY = unit.pos.y;
      }
    }

    // Clamp target to max distance
    const dx = targetX - unit.pos.x;
    const dy = targetY - unit.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      const ratio = maxDistance / distance;
      targetX = Math.floor(unit.pos.x + dx * ratio);
      targetY = Math.floor(unit.pos.y + dy * ratio);
    }

    // Clamp to field bounds
    targetX = Math.max(0, Math.min(this.sim.fieldWidth - 1, targetX));
    targetY = Math.max(0, Math.min(this.sim.fieldHeight - 1, targetY));

    const startX = unit.pos.x;
    const startY = unit.pos.y;

    // Visual effects - departure
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          pos: {
            x: startX * 8 + 4,
            y: startY * 8 + 4,
          },
          vel: {
            x: Math.cos(angle) * 2,
            y: Math.sin(angle) * 2,
          },
          lifetime: 20,
          type: "void",
          color: "#9400D3", // Violet
          radius: 1,
          z: 10,
        },
      });
    }

    // Teleport the unit instantly (mark as teleport to skip interpolation)
    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: unitId,
        x: targetX,
        y: targetY,
        teleport: true, // Skip interpolation for instant teleport
      },
    });

    // Update metadata
    this.sim.queuedCommands.push({
      type: "meta",
      params: {
        unitId: unitId,
        meta: {
          ...unit.meta,
          lastBlinkTime: this.sim.ticks,
          facing: dx > 0 ? "right" : dx < 0 ? "left" : unit.meta?.facing,
          teleported: true, // Mark that unit just teleported
        },
      },
    });

    // Visual effects - arrival
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const dist = Math.random() * 3;
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          pos: {
            x: targetX * 8 + 4 + Math.cos(angle) * dist,
            y: targetY * 8 + 4 + Math.sin(angle) * dist,
          },
          vel: {
            x: -Math.cos(angle) * 0.5,
            y: -Math.sin(angle) * 0.5,
          },
          lifetime: 15,
          type: "void",
          color: "#9400D3", // Violet
          radius: 0.8,
          z: 10,
        },
      });
    }

    // Apply brief invulnerability
    if (invulnerable) {
      this.sim.queuedCommands.push({
        type: "applyStatusEffect",
        params: {
          targetId: unitId,
          effect: "invulnerable",
          duration: 5, // Very brief
        },
      });
    }

    // Deal AOE damage on arrival if specified
    if (damage > 0 && radius > 0) {
      const targets = this.sim.units.filter((u) => {
        if (u.id === unitId || u.team === unit.team || u.hp <= 0) return false;
        const distX = Math.abs(u.pos.x - targetX);
        const distY = Math.abs(u.pos.y - targetY);
        return distX <= radius && distY <= radius;
      });

      for (const target of targets) {
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: target.id,
            amount: damage,
            source: unitId,
            aspect: "arcane",
          },
        });

        // Small knockback from center
        const knockX = target.pos.x - targetX;
        const knockY = target.pos.y - targetY;
        const knockDist = Math.sqrt(knockX * knockX + knockY * knockY) || 1;

        this.sim.queuedCommands.push({
          type: "knockback",
          params: {
            targetId: target.id,
            force: 2,
            direction: {
              x: (knockX / knockDist) * 2,
              y: (knockY / knockDist) * 2,
            },
          },
        });
      }

      // Visual explosion effect
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            pos: {
              x: targetX * 8 + 4,
              y: targetY * 8 + 4,
            },
            vel: {
              x: Math.cos(angle) * 4,
              y: Math.sin(angle) * 4,
            },
            lifetime: 25,
            type: "arcane",
            color: "#FF00FF", // Magenta
            radius: 2,
            z: 8,
          },
        });
      }
    }

    console.log(
      `[Blink] Unit ${unitId} blinks from (${startX}, ${startY}) to (${targetX}, ${targetY})`,
    );
  }
}
