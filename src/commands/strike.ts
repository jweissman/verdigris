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
    const direction =
      (params.direction as string) || attacker.meta?.facing || "right";
    const damage = (params.damage as number) || attacker.dmg || 10;
    console.log(`[Strike] Damage will be: ${damage} (params.damage=${params.damage}, attacker.dmg=${attacker.dmg})`);
    const knockback = (params.knockback as number) || 0;
    const aspect = (params.aspect as string) || "kinetic";
    const range =
      (params.range as number) || (attacker.tags?.includes("hero") ? 7 : 1);

    // Generate attack pattern based on unit type
    // Hero gets a wide "visor" pattern - very wide but short range
    const isHero = attacker.tags?.includes("hero");
    const attackZones = generateAttackPattern({
      origin: attacker.pos,
      direction: direction as "left" | "right" | "up" | "down",
      range: isHero ? 3 : range, // Hero has shorter range for visor
      pattern: isHero ? "visor" : "line",
      width: isHero ? 7 : 1, // Very wide sweep for visor
      taper: 0, // No taper for visor pattern
    });

    // Store attack zones in sim for ALL units (not just hero)
    const transform = new Transform(this.sim);
    transform.updateUnit(attacker.id, {
      meta: {
        ...attacker.meta,
        attackStartTick: this.sim.ticks,
        attackEndTick: this.sim.ticks + 10,
      },
    });

    // Queue AOE event for visualization through sim
    if (attackZones.length > 0) {
      this.sim.queuedEvents.push({
        kind: "aoe",
        source: attacker.id,
        target: attacker.pos,
        meta: {
          zones: attackZones, // Pass zones for rendering
          duration: 30,
          aspect: aspect,
          tick: this.sim.ticks,
        },
      });
    }

    // Hit all enemies in attack zones
    const enemies = this.sim.units.filter((u) => {
      if (u.id === attacker.id || u.team === attacker.team || u.hp <= 0)
        return false;
      return attackZones.some(
        (zone) =>
          Math.abs(u.pos.x - zone.x) < 0.5 && Math.abs(u.pos.y - zone.y) < 0.5,
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
