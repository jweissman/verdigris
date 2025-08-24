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
    
    // Check if already jumping
    if (unit.meta?.jumping) {
      // Buffer the jump for when we land
      unit.meta.jumpBuffered = true;
      unit.meta.jumpBufferTick = this.sim.ticks || 0;
      unit.meta.bufferedJumpParams = params;
      return;
    }

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

    // Add warning indicators at landing zone if there's AoE damage
    if (damage > 0 && radius > 0) {
      // Create warning particles at the landing zone
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const zoneX = Math.round(targetX + dx);
            const zoneY = Math.round(targetY + dy);
            if (zoneX >= 0 && zoneX < this.sim.width && 
                zoneY >= 0 && zoneY < this.sim.height) {
              
              // Add pre-impact warning particles
              this.sim.queuedCommands.push({
                type: 'particle',
                params: {
                  pos: { x: zoneX * 8 + 4, y: zoneY * 8 + 4 },
                  vel: { x: 0, y: -0.1 },
                  lifetime: 20,
                  type: 'warning',
                  color: `hsla(30, 100%, ${70 - dist * 10}%, ${0.6 - dist * 0.1})`,
                  radius: 3 - dist * 0.3,
                  z: 1
                }
              });
            }
          }
        }
      }
    }

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
