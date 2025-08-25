import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { Abilities } from "./abilities";
import type { QueuedCommand } from "../core/command_handler";

export class Jumping extends Rule {
  private commands: QueuedCommand[] = [];

  private readonly GRAVITY = 0.5; // Gravity strength
  private readonly JUMP_VELOCITY = -8; // Initial upward velocity
  private readonly TERMINAL_VELOCITY = 10; // Max fall speed

  private readonly COYOTE_TIME = 3; // Ticks after leaving ground where jump still works
  private readonly JUMP_BUFFER_TIME = 5; // Ticks to buffer jump input before landing

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(context, unit);
      }

      if (unit.meta?.wasGrounded && !unit.meta?.jumping) {
        unit.meta.coyoteTimeLeft = this.COYOTE_TIME;
        unit.meta.wasGrounded = false;
      }

      if (unit.meta?.coyoteTimeLeft > 0) {
        unit.meta.coyoteTimeLeft--;
      }

      if (unit.meta?.jumpBuffered) {
        const timeSinceBuffer =
          context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
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

    const jumpDuration = 8; // Very fast jump - faster than movement
    const t = progress / jumpDuration;

    let newX = jumpOrigin.x;
    let newY = jumpOrigin.y;

    if (jumpTarget && jumpOrigin) {
      const dx = jumpTarget.x - jumpOrigin.x;
      const dy = jumpTarget.y - jumpOrigin.y;

      newX = jumpOrigin.x + dx * t;
      newY = jumpOrigin.y + dy * t;
    }

    const peakHeight = unit.meta.jumpHeight || 6;
    const z = Math.max(0, 4 * peakHeight * t * (1 - t));
    
    // If doing a midair flip, add rotation
    if (unit.meta.isFlipping) {
      const flipProgress = progress / jumpDuration;
      unit.meta.rotation = flipProgress * 360; // Full 360 degree flip
    }

    if (progress >= jumpDuration) {
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

      if (unit.meta.jumpBuffered) {
        const timeSinceBuffer =
          context.getCurrentTick() - (unit.meta.jumpBufferTick || 0);
        if (timeSinceBuffer <= this.JUMP_BUFFER_TIME) {
          this.commands.push({
            type: "jump",
            unitId: unit.id,
            params: unit.meta.bufferedJumpParams || {},
          });
        }
        unit.meta.jumpBuffered = false;
      }

      if (unit.meta.jumpDamage && unit.meta.jumpRadius) {
        const landingPos = unit.meta.jumpTarget || unit.pos;
        const radius = unit.meta.jumpRadius;

        this.commands.push({
          type: "aoe",
          unitId: unit.id,
          params: {
            x: landingPos.x,
            y: landingPos.y,
            radius: radius,
            damage: unit.meta.jumpDamage,
            type: "kinetic",
            friendlyFire: false,
            excludeSource: true,
          },
        });

        for (let ring = 0; ring < 3; ring++) {
          const ringDelay = ring * 2;
          const ringRadius = ((ring + 1) * radius) / 3;

          for (let i = 0; i < 16; i++) {
            const angle = (Math.PI * 2 * i) / 16;
            const speed = 0.5 + ring * 0.2;

            this.commands.push({
              type: "particle",
              params: {
                particle: {
                  pos: {
                    x: landingPos.x * 8 + 4 + Math.cos(angle) * ringRadius * 2,
                    y: landingPos.y * 8 + 4 + Math.sin(angle) * ringRadius * 2,
                  },
                  vel: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed - 0.3,
                  },
                  radius: 2.5 - ring * 0.5,
                  lifetime: 20 - ring * 3,
                  color: `hsl(${45 - ring * 10}, 100%, ${70 - ring * 10}%)`,
                  type: "shockwave",
                },
              },
            });
          }
        }

        const impactedUnits = context.getAllUnits().filter((u) => {
          if (u.id === unit.id || u.team === unit.team) return false;
          const dx = u.pos.x - landingPos.x;
          const dy = u.pos.y - landingPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          return dist <= radius;
        });

        for (const target of impactedUnits) {
          this.commands.push({
            type: "particle",
            params: {
              particle: {
                pos: {
                  x: target.pos.x * 8 + 4,
                  y: target.pos.y * 8 + 4,
                },
                vel: { x: 0, y: -1 },
                radius: 4,
                lifetime: 10,
                color: "#FF4444",
                type: "damage_flash",
              },
            },
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
            smoothX: null,
            smoothY: null,
            hasDoubleJumped: false,
            isFlipping: false,
            rotation: 0,
          },
        },
      });
    } else {
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: Math.round(newX),
          y: Math.round(newY),
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

            smoothX: newX,
            smoothY: newY,
          },
        },
      });
    }
  }
}
