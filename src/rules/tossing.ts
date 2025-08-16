import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export class Tossing extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta.tossing) {
        this.processToss(context, unit as Unit);
      }
    }
    return this.commands;
  }

  private processToss(context: TickContext, unit: Unit): void {
    const tossDuration = 8; // Fixed duration for toss (faster than jump)
    const tossProgress = (unit.meta.tossProgress || 0) + 1;

    if (tossProgress >= tossDuration) {
      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: unit.meta.tossTarget?.x || unit.pos.x,
          y: unit.meta.tossTarget?.y || unit.pos.y,
          z: 0,
        },
      });

      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            tossing: false,
            tossProgress: undefined,
            tossOrigin: undefined,
            tossTarget: undefined,
            tossForce: undefined,
          },
        },
      });

      if (unit.meta.tossForce && unit.meta.tossForce > 3) {
        context.queueEvent({
          kind: "aoe",
          source: unit.id,
          target: unit.pos,
          meta: {
            radius: 1,
            amount: Math.floor(unit.meta.tossForce / 2),
          },
        });
      }
    } else {
      const progress = tossProgress / tossDuration;
      const origin = unit.meta.tossOrigin || { x: unit.pos.x, y: unit.pos.y };
      const target = unit.meta.tossTarget || { x: unit.pos.x, y: unit.pos.y };

      const newX = origin.x + (target.x - origin.x) * progress;
      const newY = origin.y + (target.y - origin.y) * progress;

      const maxHeight = 3; // Lower arc than jump
      const newZ = maxHeight * Math.sin(progress * Math.PI) * 2;

      this.commands.push({
        type: "move",
        params: {
          unitId: unit.id,
          x: newX,
          y: newY,
          z: newZ,
        },
      });

      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: { tossProgress: tossProgress },
        },
      });
    }
  }
}
