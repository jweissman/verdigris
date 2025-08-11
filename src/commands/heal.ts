import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Heal command - heals a target unit
 * Params:
 *   targetId: string - ID of the unit to heal
 *   amount: number - Amount of healing
 *   aspect?: string - Type of healing (defaults to 'healing')
 */
export class Heal extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.targetId as string;
    const amount = params.amount as number;
    const aspect = (params.aspect as string) || 'healing';
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn(`Heal command: invalid amount ${amount}`);
      return;
    }

    // Apply heal directly using Transform
    const transform = this.sim.getTransform();
    transform.mapUnits(unit => {
      if (unit.id === targetId) {
        const newHp = Math.min(unit.hp + amount, unit.maxHp);
        return {
          ...unit,
          hp: newHp
        };
      }
      return unit;
    });
  }
}