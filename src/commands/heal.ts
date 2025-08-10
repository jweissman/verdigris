import { Command, CommandParams } from "../rules/command";

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
    
    const target = this.sim.units.find(u => u.id === targetId);
    if (!target) {
      console.warn(`Heal command: target ${targetId} not found`);
      return;
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      console.warn(`Heal command: invalid amount ${amount}`);
      return;
    }

    this.sim.queuedEvents.push({
      kind: 'heal',
      source: unitId,
      target: targetId,
      meta: {
        aspect: aspect,
        amount: amount
      }
    });

    console.log(`✨ ${unitId} heals ${targetId} for ${amount} points`);
  }
}