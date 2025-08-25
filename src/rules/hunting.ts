import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Simple hunting behavior for enemies to pursue targets
 */
export class Hunting extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();

    const hunters = allUnits.filter(
      (u) => u.meta?.hunting && u.hp > 0 && u.state !== "dead",
    );

    for (const hunter of hunters) {
      let closestTarget = null;
      let minDistance = Infinity;

      for (const target of allUnits) {
        if (target.team === hunter.team) continue;
        if (target.hp <= 0) continue;
        if (target.meta?.phantom) continue;

        const dx = target.pos.x - hunter.pos.x;
        const dy = target.pos.y - hunter.pos.y;
        const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance

        if (distance < minDistance) {
          minDistance = distance;
          closestTarget = target;
        }
      }

      if (!closestTarget) continue;

      const dx = closestTarget.pos.x - hunter.pos.x;
      const dy = closestTarget.pos.y - hunter.pos.y;

      let moveX = 0;
      let moveY = 0;

      if (Math.abs(dx) > Math.abs(dy)) {
        moveX = dx > 0 ? 1 : -1;
      } else if (dy !== 0) {
        moveY = dy > 0 ? 1 : -1;
      } else if (dx !== 0) {
        moveX = dx > 0 ? 1 : -1;
      }

      if (minDistance > 1) {
        const tick = context.getCurrentTick();
        const moveInterval = Math.floor(6 / (hunter.meta?.speed || 1)); // Slower movement

        if (tick % moveInterval === 0) {
          commands.push({
            type: "move",
            unitId: hunter.id,
            params: {
              dx: moveX,
              dy: moveY,
            },
          });
        }
      }
    }

    return commands;
  }
}
