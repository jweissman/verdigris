import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * AttackAnimationCleanup rule - handles resetting attack animations after they complete
 * Also handles removing temporary effect units with lifetime
 */
export class AttackAnimationCleanup extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    const allUnits = context.getAllUnits();

    for (const unit of allUnits) {
      // Handle effect unit lifetime
      if (unit.meta?.lifetime !== undefined && unit.meta.lifetime > 0) {
        const newLifetime = unit.meta.lifetime - 1;
        if (newLifetime <= 0) {
          commands.push({
            type: "remove",
            params: {
              unitId: unit.id,
            },
          });
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                lifetime: newLifetime,
              },
            },
          });
        }
      }

      // Handle attack animation cleanup
      if (unit.state === "attack" && unit.meta?.attackEndTick) {
        if (currentTick >= unit.meta.attackEndTick) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                attackStartTick: undefined,
                attackEndTick: undefined,
              },
            },
          });

          const unitToReset = context.findUnitById(unit.id);
          if (unitToReset) {
            unitToReset.state = "idle";
          }
        }
      }
    }

    return commands;
  }
}
