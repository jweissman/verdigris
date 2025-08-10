import { Command } from "../rules/command";

/**
 * AoE (Area of Effect) command - affects units in an area
 * Usage: aoe <centerX> <centerY> <radius> <amount> [aspect]
 */
export class AoE extends Command {
  execute(unitId: string, centerX: string, centerY: string, radius: string, amount: string, aspect: string = 'physical') {
    const center = { x: parseFloat(centerX), y: parseFloat(centerY) };
    const aoeRadius = parseFloat(radius);
    const aoeAmount = parseInt(amount);

    if (isNaN(aoeRadius) || isNaN(aoeAmount)) {
      console.warn(`AoE command: invalid radius ${radius} or amount ${amount}`);
      return;
    }

    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: unitId,
      target: center,
      meta: {
        aspect: aspect,
        amount: aoeAmount,
        radius: aoeRadius,
        origin: center
      }
    });

    const effectType = aoeAmount > 0 ? 'damage' : 'healing';
    console.log(`💥 ${unitId} creates ${effectType} AoE at (${centerX}, ${centerY}) radius ${radius}`);
  }
}