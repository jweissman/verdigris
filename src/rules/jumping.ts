import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { Abilities } from "./abilities";
import type { QueuedCommand } from "../core/command_handler";

export class Jumping extends Rule {
  private commands: QueuedCommand[] = [];
  
  // Physics constants for better feel
  private readonly GRAVITY = 0.5;          // Gravity strength
  private readonly JUMP_VELOCITY = -8;     // Initial upward velocity
  private readonly TERMINAL_VELOCITY = 10; // Max fall speed

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(context, unit);
      }
    }
    return this.commands;
  }

  private updateJump(context: TickContext, unit: any): void {
    const jumpTarget = unit.meta.jumpTarget;
    const jumpOrigin = unit.meta.jumpOrigin || unit.pos;
    
    // Use velocity-based physics
    let velocity = unit.meta.jumpVelocity || this.JUMP_VELOCITY;
    const progress = (unit.meta.jumpProgress || 0) + 1;
    
    // Apply gravity to velocity
    velocity = Math.min(velocity + this.GRAVITY, this.TERMINAL_VELOCITY);
    
    // Calculate horizontal position based on progress
    const maxDuration = 20; // Max jump duration
    const t = Math.min(1, progress / maxDuration);
    let newX = jumpOrigin.x;
    let newY = jumpOrigin.y;
    
    if (jumpTarget && jumpOrigin) {
      const dx = jumpTarget.x - jumpOrigin.x;
      const dy = jumpTarget.y - jumpOrigin.y;
      
      // Horizontal movement (ease-out curve for better feel)
      const easeT = 1 - Math.pow(1 - t, 2); // Ease-out quadratic
      newX = jumpOrigin.x + dx * easeT;
      newY = jumpOrigin.y + dy * easeT;
    }
    
    // Calculate height using physics simulation
    const initialVelocity = this.JUMP_VELOCITY;
    const time = progress * 0.1; // Convert to time units
    const rawZ = -(initialVelocity * time + 0.5 * this.GRAVITY * time * time);
    const z = Math.max(0, rawZ);

    // Check if we should land (when raw Z would go below ground)
    if (rawZ <= 0 && progress > 1) {
      // Land exactly at target
      if (jumpTarget) {
        this.commands.push({
          type: "move",
          params: {
            unitId: unit.id,
            x: jumpTarget.x,
            y: jumpTarget.y,
          },
        });
      }
      
      if (unit.meta.jumpDamage && unit.meta.jumpRadius) {
        context.queueEvent({
          kind: "aoe",
          source: unit.id,
          target: unit.meta.jumpTarget || unit.pos,
          meta: {
            aspect: "kinetic",
            radius: unit.meta.jumpRadius,
            amount: unit.meta.jumpDamage,
            force: 3,
          },
        });
      }

      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            ...unit.meta,
            jumping: false,
            jumpProgress: 0,
            z: 0,
            jumpTarget: null,
            jumpOrigin: null,
            jumpDamage: null,
            jumpRadius: null,
          },
        },
      });
    } else {
      // Continue jump - update position and metadata
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: newX,
          y: newY,
        },
      });

      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            ...unit.meta,
            jumpProgress: progress,
            jumpVelocity: velocity,
            z: z,
          },
        },
      });
    }
  }
}
