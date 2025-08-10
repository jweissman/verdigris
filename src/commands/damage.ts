import { Command, CommandParams } from "../rules/command";

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

    this.sim.queuedEvents.push({
      kind: 'damage',
      source: unitId,
      target: targetId,
      meta: {
        aspect: aspect,
        amount: amount,
        origin: origin
      }
    });
  }
}