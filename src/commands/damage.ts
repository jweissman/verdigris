import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Damage command - deals damage to a target unit
 * Params:
 *   targetId: string - ID of the unit to damage
 *   amount: number - Amount of damage to deal
 *   aspect?: string - Type of damage (physical, radiant, fire, etc.)
 *   origin?: {x: number, y: number} - Origin point of damage for directional effects
 */
export class Damage extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.targetId as string;
    const amount = params.amount as number;
    const aspect = (params.aspect as string) || 'physical';
    const origin = params.origin as {x: number, y: number} | undefined;
    
    const target = this.sim.units.find(u => u.id === targetId);
    if (!target) {
      console.warn(`Damage command: target ${targetId} not found`);
      return;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn(`Damage command: invalid amount ${amount}`);
      return;
    }

    // Apply damage using Transform
    const transform = this.sim.getTransform();
    transform.mapUnits(unit => {
      if (unit.id === targetId) {
        // Damage amount has already been modified by Perdurance rule if needed
        const newHp = Math.max(0, unit.hp - amount); // Clamp HP to minimum 0
        return {
          ...unit,
          hp: newHp,
          state: newHp <= 0 ? 'dead' : unit.state,
          meta: {
            ...unit.meta,
            impactFrame: this.sim.ticks
          }
        };
      }
      // Mark attacker for impact frame too
      if (params.sourceId && unit.id === params.sourceId) {
        return {
          ...unit,
          meta: {
            ...unit.meta,
            impactFrame: this.sim.ticks
          }
        };
      }
      return unit;
    });
  }
}