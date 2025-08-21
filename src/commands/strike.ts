import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

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
    const direction = params.direction as string;
    const damage = (params.damage as number) || attacker.dmg || 10;
    const range = (params.range as number) || 1;

    let target: any = null;

    if (targetId) {
      // Strike specific target
      target = this.sim.units.find((u) => u.id === targetId && u.hp > 0);
    } else {
      // Strike in direction or facing
      const strikeDirection = direction || attacker.meta?.facing || "right";
      target = this.findTargetInDirection(attacker, strikeDirection, range);
    }

    if (target && this.isInRange(attacker, target, range)) {
      // Queue damage event
      this.sim.processedEvents.push({
        kind: "damage",
        source: attacker.id,
        target: target.id,
        meta: {
          amount: damage,
          aspect: "kinetic",
          tick: this.sim.ticks,
          isStrike: true // Mark as strike for visual effects
        }
      });

      // Set attacker state for animation
      const transform = new Transform(this.sim);
      transform.updateUnit(attacker.id, {
        state: "attack",
        meta: {
          ...attacker.meta,
          lastStrike: this.sim.ticks,
          attackStartTick: this.sim.ticks
        }
      });
      
      // Clear attack state after animation
      setTimeout(() => {
        const unit = this.sim.units.find(u => u.id === attacker.id);
        if (unit && unit.meta?.attackStartTick === this.sim.ticks) {
          transform.updateUnit(attacker.id, {
            state: "idle"
          });
        }
      }, 800); // 8 frames at 100ms each

      // Apply damage
      transform.updateUnit(target.id, {
        hp: Math.max(0, target.hp - damage)
      });

      // Check if target died
      if (target.hp - damage <= 0) {
        transform.updateUnit(target.id, {
          state: "dead",
          hp: 0
        });
      }
    }
  }

  private findTargetInDirection(attacker: any, direction: string, range: number): any {
    const dx = direction === "right" ? 1 : direction === "left" ? -1 : 0;
    const dy = direction === "down" ? 1 : direction === "up" ? -1 : 0;

    // Look for targets in the strike direction
    for (let r = 1; r <= range; r++) {
      const checkX = attacker.pos.x + dx * r;
      const checkY = attacker.pos.y + dy * r;

      const target = this.sim.units.find(
        (u) => 
          u.hp > 0 &&
          u.team !== attacker.team &&
          Math.abs(u.pos.x - checkX) < 0.5 &&
          Math.abs(u.pos.y - checkY) < 0.5
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