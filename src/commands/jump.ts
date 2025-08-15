import { Command, CommandParams } from '../rules/command';
import { Transform } from '../core/transform';

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
    
    const transform = new Transform(this.sim);
    
    // Get unit position before setting jump
    const units = this.sim.units;
    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    
    const targetX = params.targetX as number;
    const targetY = params.targetY as number;
    const height = (params.height as number) || 5;
    const damage = (params.damage as number) || 5;
    const radius = (params.radius as number) || 3;

    // Set up jumping state - the Jumping rule will handle the animation
    transform.updateUnit(unitId, {
      meta: {
        ...unit.meta,
        jumping: true,
        jumpProgress: 0,
        jumpOrigin: { x: unit.pos.x, y: unit.pos.y },
        jumpTarget: { x: targetX, y: targetY },
        jumpHeight: height,
        jumpDamage: damage,
        jumpRadius: radius,
        z: 0
      }
    });
  }
}