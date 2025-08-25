import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";
import { generateAttackPattern } from "../utils/attack_patterns";

/**
 * Strike command - unit performs a melee attack
 * Can target specific enemy or strike in facing direction
 * Params:
 *   targetId?: string - Specific unit to strike (optional)
 *   direction?: string - Direction to strike if no target ('left' | 'right' | 'up' | 'down')
 *   damage?: number - Override damage amount (optional, uses unit's dmg by default)
 *   range?: number - Strike range in tiles (default 1 for melee)
 */
export class StrikeCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;

    const attacker = this.sim.units.find((u) => u.id === unitId);
    if (!attacker) return;

    const targetId = params.targetId as string;
    const direction = params.direction as string || attacker.meta?.facing || "right";
    const damage = (params.damage as number) || attacker.dmg || 10;
    const knockback = (params.knockback as number) || 0;
    const aspect = (params.aspect as string) || "kinetic";
    const range = (params.range as number) || (attacker.tags?.includes("hero") ? 7 : 1);

    // If attacker is a hero, do area attack with tapered pattern
    if (attacker.tags?.includes("hero")) {
      
      // Use pattern generator for consistent attack shape
      const attackZones = generateAttackPattern({
        origin: attacker.pos,
        direction: direction as 'left' | 'right' | 'up' | 'down',
        range: range,
        pattern: 'cone',
        width: 13,  // Wide powerful attack
        taper: 1.2   // Gentle taper
      });
      
      // Store attack zones on attacker for visualization
      const transform = new Transform(this.sim);
      transform.updateUnit(attacker.id, {
        meta: {
          ...attacker.meta,
          attackZones: attackZones,
          attackZonesExpiry: this.sim.ticks + 30, // Show for 30 ticks
        }
      });

      // Hit all enemies in attack zones
      const enemies = this.sim.units.filter((u) => {
        if (u.id === attacker.id || u.team === attacker.team || u.hp <= 0) return false;
        return attackZones.some(zone => 
          Math.abs(u.pos.x - zone.x) < 0.5 && Math.abs(u.pos.y - zone.y) < 0.5
        );
      });

      for (const enemy of enemies) {
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: enemy.id,
            amount: damage,
            aspect: aspect,
            sourceId: attacker.id,
            origin: attacker.pos,
          },
        });
      }

      // Create AOE event for visual effect
      if (attackZones.length > 0) {
        const centerZone = attackZones[0];
        this.sim.queuedEvents.push({
          kind: "aoe",
          source: attacker.id,
          target: centerZone,
          meta: {
            radius: 1.5,
            amount: damage,
            aspect: aspect,
            tick: this.sim.ticks,
          },
        });
      }
    } else {
      // Non-hero strike - single target
      let target: any = null;

      if (targetId) {
        target = this.sim.units.find((u) => u.id === targetId && u.hp > 0);
      } else {
        target = this.findTargetInDirection(attacker, direction, range);
      }

      if (target && (targetId || this.isInRange(attacker, target, range))) {
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: target.id,
            amount: damage,
            aspect: aspect,
            sourceId: attacker.id,
            origin: attacker.pos,
          },
        });
      }

      // Events are observational only - don't create damage events here
      // The damage command will handle everything

      if (knockback > 0) {
        const dx = target.pos.x - attacker.pos.x;
        const dy = target.pos.y - attacker.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
          const knockX = (dx / dist) * knockback;
          const knockY = (dy / dist) * knockback;

          this.sim.queuedCommands.push({
            type: "move",
            unitId: target.id,
            params: {
              dx: Math.round(knockX),
              dy: Math.round(knockY),
              force: true, // Force movement even if pinned/stunned
            },
          });
        }
      }

      const transform = new Transform(this.sim);
      transform.updateUnit(attacker.id, {
        state: "attack",
        meta: {
          ...attacker.meta,
          lastStrike: this.sim.ticks,
          attackStartTick: this.sim.ticks,
          attackEndTick: this.sim.ticks + 6, // Attack animation duration
        },
      });
    }
  }

  private findTargetInDirection(
    attacker: any,
    direction: string,
    range: number,
  ): any {
    const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

    for (let r = 1; r <= range; r++) {
      const checkX = attacker.pos.x + dx * r;
      const checkY = attacker.pos.y + dy * r;

      const target = this.sim.units.find(
        (u) =>
          u.hp > 0 &&
          u.team !== attacker.team &&
          Math.abs(u.pos.x - checkX) < 0.5 &&
          Math.abs(u.pos.y - checkY) < 0.5,
      );

      if (target) return target;
    }

    return null;
  }

  private isInRange(attacker: any, target: any, range: number): boolean {
    const dx = Math.abs(attacker.pos.x - target.pos.x);
    const dy = Math.abs(attacker.pos.y - target.pos.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= range;
  }
}
