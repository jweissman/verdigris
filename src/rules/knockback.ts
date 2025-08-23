import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class Knockback extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    
    // Check for knockbacks
    const knockbackRange = 1.1;
    const knockbackRangeSq = knockbackRange * knockbackRange;

    const arrays = context.getArrays();

    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 3 || arrays.mass[i] === 0) continue; // Skip dead or massless

      const x1 = arrays.posX[i];
      const y1 = arrays.posY[i];
      const team1 = arrays.team[i];
      const mass1 = arrays.mass[i];

      for (const j of arrays.activeIndices) {
        if (i === j || arrays.state[j] === 3 || arrays.mass[j] === 0) continue;
        if (team1 === arrays.team[j]) continue; // Same team, no knockback

        const dx = arrays.posX[j] - x1;
        const dy = arrays.posY[j] - y1;
        const distSq = dx * dx + dy * dy;

        if (distSq <= knockbackRangeSq && distSq > 0) {
          const mass2 = arrays.mass[j];
          const massDiff = mass1 - mass2;

          if (massDiff > 0) {
            const coldData = context.getUnitColdDataByIndex(j);
            if (coldData?.meta?.phantom) continue;

            const dist = Math.sqrt(distSq);
            const pushX = (dx / dist) * 0.5;
            const pushY = (dy / dist) * 0.5;

            this.commands.push({
              type: "move",
              params: {
                unitId: arrays.unitIds[j],
                dx: pushX,
                dy: pushY,
              },
            });
          }
        }
      }
    }

    return this.commands;
  }
}