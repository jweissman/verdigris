import { Command } from "../rules/command";

/**
 * Heal command - heals a target unit
 * Usage: heal <targetId> <amount> [aspect]
 */
export class Heal extends Command {
  execute(unitId: string, targetId: string, amount: string, aspect: string = 'healing') {
    const target = this.sim.units.find(u => u.id === targetId);
    if (!target) {
      console.warn(`Heal command: target ${targetId} not found`);
      return;
    }

    const healAmount = parseInt(amount);
    if (isNaN(healAmount)) {
      console.warn(`Heal command: invalid amount ${amount}`);
      return;
    }

    this.sim.queuedEvents.push({
      kind: 'heal',
      source: unitId,
      target: targetId,
      meta: {
        aspect: aspect,
        amount: healAmount
      }
    });

    console.log(`✨ ${unitId} heals ${targetId} for ${healAmount} points`);
  }
}