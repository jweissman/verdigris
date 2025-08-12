import { Command, CommandParams } from '../rules/command';
import { Transform } from '../core/transform';

/**
 * Burrow command - unit burrows underground
 * Params:
 *   targetX?: number - Target X position to emerge at
 *   targetY?: number - Target Y position to emerge at
 *   duration?: number - How long to stay burrowed (default 15)
 */
export class BurrowCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    
    const transform = new Transform(this.sim);
    
    // Get unit to burrow
    const units = this.sim.getPendingUnits ? this.sim.getPendingUnits() : this.sim.units;
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    
    const duration = (params.duration as number) || 15;
    const targetX = params.targetX as number;
    const targetY = params.targetY as number;

    // Set up burrowed state
    transform.updateUnit(unitId, {
      meta: {
        ...unit.meta,
        burrowed: true,
        invisible: true,
        burrowDuration: duration,
        burrowStartTick: this.sim.ticks,
        burrowTargetX: targetX,
        burrowTargetY: targetY
      }
    });
  }
}