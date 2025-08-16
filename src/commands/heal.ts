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
    const aspect = (params.aspect as string) || "healing";
    const newMaxHp = params.newMaxHp as number | undefined; // For buff heals

    if (typeof amount !== "number" || isNaN(amount)) {
      console.warn(`Heal command: invalid amount ${amount}`);
      return;
    }

    const transform = this.sim.getTransform();
    const target = this.sim.units.find((u) => u.id === targetId);
    if (!target) {
      console.warn(`Heal command: target ${targetId} not found`);
      return;
    }

    if (newMaxHp !== undefined) {
      transform.updateUnit(targetId, {
        maxHp: newMaxHp,
        hp: target.hp + amount,
      });
    } else {
      const newHp = Math.min(target.hp + amount, target.maxHp);
      transform.updateUnit(targetId, {
        hp: newHp,
      });
    }
  }
}
