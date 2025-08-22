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
    const progress = (unit.meta.jumpProgress || 0) + 1;
    
    // Simple parabolic arc with good feel
    const jumpDuration = 15; // Total jump duration in ticks
    const t = progress / jumpDuration;
    
    let newX = jumpOrigin.x;
    let newY = jumpOrigin.y;
    
    if (jumpTarget && jumpOrigin) {
      const dx = jumpTarget.x - jumpOrigin.x;
      const dy = jumpTarget.y - jumpOrigin.y;
      
      // Smooth horizontal movement
      newX = jumpOrigin.x + dx * t;
      newY = jumpOrigin.y + dy * t;
    }
    
    // Parabolic height with good arc
    const peakHeight = 5;
    const z = Math.max(0, 4 * peakHeight * t * (1 - t));

    // Check if we should land
    if (progress >= jumpDuration) {
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
            z: z,
          },
        },
      });
    }
  }
}
