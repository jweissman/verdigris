import { Command, CommandParams } from '../rules/command';

/**
 * Jump command - unit jumps to target location with impact damage
 * Params:
 *   targetX: number - Target X position
 *   targetY: number - Target Y position
 *   height?: number - Jump height (default 5)
 *   damage?: number - Impact damage (default 5)
 *   radius?: number - Impact radius (default 3)
 */
export class JumpCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    const unit = this.sim.units.find(u => u.id === unitId);
    if (!unit) return;

    const targetX = params.targetX as number;
    const targetY = params.targetY as number;
    const height = (params.height as number) || 5;
    const damage = (params.damage as number) || 5;
    const radius = (params.radius as number) || 3;

    // Move unit to target position (simple implementation)
    unit.pos = { x: targetX, y: targetY };
    
    // Queue AOE damage at landing spot
    this.sim.queuedEvents.push({
      kind: 'aoe',
      source: unitId,
      target: { x: targetX, y: targetY },
      meta: {
        aspect: 'impact',
        amount: damage,
        radius: radius,
        origin: { x: targetX, y: targetY }
      }
    });

    console.log(`🦘 ${unitId} jumps to (${targetX}, ${targetY}) with impact damage ${damage}`);
  }
}