import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { Abilities } from "./abilities";
import type { QueuedCommand } from "../core/command_handler";

export class Jumping extends Rule {
  private commands: QueuedCommand[] = [];

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
    const jumpOrigin = unit.meta.jumpOrigin;
    let jumpDuration = 10; // Default

    if (jumpTarget && jumpOrigin) {
      const dx = jumpTarget.x - jumpOrigin.x;
      const dy = jumpTarget.y - jumpOrigin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      jumpDuration = Math.min(15, Math.max(3, Math.round(distance * 0.7)));
    }

    const newProgress = (unit.meta.jumpProgress || 0) + 1;

    if (newProgress >= jumpDuration) {
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
      const jumpTarget = unit.meta.jumpTarget;
      if (jumpTarget) {
        const t = newProgress / jumpDuration;

        const distance = Math.sqrt(
          Math.pow(jumpTarget.x - unit.pos.x, 2) +
            Math.pow(jumpTarget.y - unit.pos.y, 2),
        );
        const arcHeight = Math.min(4, 1 + distance / 10); // Scale height with distance
        const height = 4 * arcHeight * t * (1 - t); // Parabolic arc

        const newX =
          unit.pos.x + (jumpTarget.x - unit.pos.x) * (1 / jumpDuration);
        const newY =
          unit.pos.y + (jumpTarget.y - unit.pos.y) * (1 / jumpDuration);

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
              jumpProgress: newProgress,
              jumpHeight: height,
              z: height, // Also set z for compatibility with tests
            },
          },
        });
      }
    }
  }
}
