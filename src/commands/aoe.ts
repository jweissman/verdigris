import { Command, CommandParams } from "../rules/command";

/**
 * AoE (Area of Effect) command - affects units in an area
 * Params:
 *   x: number - Center X position
 *   y: number - Center Y position
 *   radius: number - Effect radius
 *   damage: number - Damage/heal amount
 *   type?: string - Damage type (defaults to 'physical')
 */
export class AoE extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const x = params.x as number;
    const y = params.y as number;
    const radius = params.radius as number;
    const damage = params.damage as number;
    const type = (params.type as string) || 'physical';
    const stunDuration = params.stunDuration as number;
    
    const center = { x, y };

    if (typeof radius !== 'number' || isNaN(radius) || typeof damage !== 'number' || isNaN(damage)) {
      console.warn(`AoE command: invalid radius ${radius} or damage ${damage}`);
      return;
    }

    const meta: any = {
      aspect: type,
      amount: damage,
      radius: radius,
      origin: center
    };

    // Add EMP-specific properties if provided
    if (stunDuration !== undefined) {
      meta.stunDuration = stunDuration;
    }

    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: unitId,
      target: center,
      meta: meta
    });

    const effectType = damage > 0 ? 'damage' : 'healing';
  }
}