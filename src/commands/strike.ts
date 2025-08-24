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
    const knockback = (params.knockback as number) || 0;
    const aspect = (params.aspect as string) || "kinetic";

    let target: any = null;

    if (targetId) {
      // Strike specific target
      target = this.sim.units.find((u) => u.id === targetId && u.hp > 0);
    } else {
      // Strike in direction or facing
      const strikeDirection = direction || attacker.meta?.facing || "right";
      target = this.findTargetInDirection(attacker, strikeDirection, range);
    }

    if (target && (targetId || this.isInRange(attacker, target, range))) {
      // Queue damage COMMAND to actually reduce HP
      this.sim.queuedCommands.push({
        type: 'damage',
        params: {
          targetId: target.id,
          amount: damage,
          aspect: aspect,
          sourceId: attacker.id
        }
      });
      
      // Queue damage event for visual effects
      this.sim.processedEvents.push({
        kind: "damage",
        source: attacker.id,
        target: target.id,
        meta: {
          amount: damage,
          aspect: aspect,
          tick: this.sim.ticks,
          isStrike: true, // Mark as strike for visual effects
          knockback: knockback
        }
      });
      
      // Apply knockback if specified
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
              force: true // Force movement even if pinned/stunned
            }
          });
        }
      }

      // Set attacker state for animation
      const transform = new Transform(this.sim);
      transform.updateUnit(attacker.id, {
        state: "attack",
        meta: {
          ...attacker.meta,
          lastStrike: this.sim.ticks
        }
      });

      // Damage will be applied by EventHandler processing the damage event
      // No need to apply it here
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