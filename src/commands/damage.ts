import { Command } from "../rules/command";

/**
 * Damage command - deals damage to a target unit
 * Usage: damage <targetId> <amount> [aspect] [originX] [originY]
 */
export class Damage extends Command {
  execute(unitId: string, targetId: string, amount: string, aspect: string = 'physical', originX?: string, originY?: string) {
    const target = this.sim.units.find(u => u.id === targetId);
    if (!target) {
      console.warn(`Damage command: target ${targetId} not found`);
      return;
    }

    const damageAmount = parseInt(amount);
    if (isNaN(damageAmount)) {
      console.warn(`Damage command: invalid amount ${amount}`);
      return;
    }

    let origin = null;
    if (originX && originY) {
      origin = { x: parseInt(originX), y: parseInt(originY) };
    }

    this.sim.queuedEvents.push({
      kind: 'damage',
      source: unitId,
      target: targetId,
      meta: {
        aspect: aspect,
        amount: damageAmount,
        origin: origin
      }
    });

    console.log(`💥 ${unitId} deals ${damageAmount} ${aspect} damage to ${targetId}`);
  }
}