import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Jump command - unit jumps to target location or in facing direction
 * Params:
 *   targetX?: number - Target X position (optional, uses facing if not provided)
 *   targetY?: number - Target Y position (optional, uses facing if not provided)
 *   distance?: number - Jump distance when using facing (default 3)
 *   height?: number - Jump height (default 5)
 *   damage?: number - Impact damage (default 0)
 *   radius?: number - Impact radius (default 0)
 */
export class JumpCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;

    const transform = new Transform(this.sim);

    const units = this.sim.units;
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    // Calculate target based on facing if not provided
    let targetX = params.targetX as number;
    let targetY = params.targetY as number;
    
    if (targetX === undefined || targetY === undefined) {
      const distance = (params.distance as number) || 3;
      const facing = unit.meta?.facing || "right";
      
      targetX = unit.pos.x + (facing === "right" ? distance : -distance);
      targetY = unit.pos.y; // Keep same Y
      
      // Clamp to field bounds
      targetX = Math.max(0, Math.min(this.sim.width - 1, targetX));
    }
    
    const height = (params.height as number) || 5;
    const damage = (params.damage as number) || 0; // Default to no damage
    const radius = (params.radius as number) || 0; // Default to no radius

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
        z: 0,
      },
    });
  }
}
