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
  
  // Game feel constants
  private readonly COYOTE_TIME = 3;        // Ticks after leaving ground where jump still works
  private readonly JUMP_BUFFER_TIME = 5;   // Ticks to buffer jump input before landing

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(context, unit);
      }
      
      // Handle coyote time
      if (unit.meta?.wasGrounded && !unit.meta?.jumping) {
        unit.meta.coyoteTimeLeft = this.COYOTE_TIME;
        unit.meta.wasGrounded = false;
      }
      
      // Decrement coyote time
      if (unit.meta?.coyoteTimeLeft > 0) {
        unit.meta.coyoteTimeLeft--;
      }
      
      // Handle jump buffer
      if (unit.meta?.jumpBuffered) {
        const timeSinceBuffer = context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
        if (timeSinceBuffer > this.JUMP_BUFFER_TIME) {
          unit.meta.jumpBuffered = false;
        }
      }
    }
    return this.commands;
  }

  private updateJump(context: TickContext, unit: any): void {
    const jumpTarget = unit.meta.jumpTarget;
    const jumpOrigin = unit.meta.jumpOrigin || unit.pos;
    const progress = (unit.meta.jumpProgress || 0) + 1;
    
    // Simple parabolic arc with good feel
    const jumpDuration = 8; // Very fast jump - faster than movement
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
    
    // Parabolic height with good arc - use actual jump height from meta
    const peakHeight = unit.meta.jumpHeight || 6;
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
      
      // Check for buffered jump
      if (unit.meta.jumpBuffered) {
        const timeSinceBuffer = context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
        if (timeSinceBuffer <= this.JUMP_BUFFER_TIME) {
          // Execute buffered jump immediately upon landing
          this.commands.push({
            type: "jump",
            unitId: unit.id,
            params: unit.meta.bufferedJumpParams || {}
          });
        }
        unit.meta.jumpBuffered = false;
      }
      
      if (unit.meta.jumpDamage && unit.meta.jumpRadius) {
        const landingPos = unit.meta.jumpTarget || unit.pos;
        
        // Queue AOE damage
        context.queueEvent({
          kind: "aoe",
          source: unit.id,
          target: landingPos,
          meta: {
            aspect: "kinetic",
            radius: unit.meta.jumpRadius,
            amount: unit.meta.jumpDamage,
            force: 3,
            friendlyFire: false, // Don't damage allies on landing
            excludeSource: true // Don't damage self
          },
        });
        
        // Add visual impact particles
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const speed = 0.3;
          this.commands.push({
            type: "particle",
            params: {
              particle: {
                pos: {
                  x: landingPos.x * 8 + 4,
                  y: landingPos.y * 8 + 4
                },
                vel: {
                  x: Math.cos(angle) * speed,
                  y: Math.sin(angle) * speed - 0.2 // Slightly upward
                },
                radius: 1.5,
                lifetime: 15,
                color: "#FFD700", // Gold impact
                type: "impact"
              }
            }
          });
        }
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
