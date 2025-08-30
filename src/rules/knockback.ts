import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import type { Unit } from "../types/Unit";

export class Knockback extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];

    const batcher = context.getPairwiseBatcher();
    if (batcher) {
      // Register knockback intent with batcher
      batcher.register(
        "Knockback",
        (unitA: Unit, unitB: Unit) => {
          const commands: QueuedCommand[] = [];
          // Phantoms can push regardless of mass, others need to be heavier
          const isPhantomPushing = unitA.meta?.phantom === true;
          if (
            !isPhantomPushing &&
            (!unitA.mass || !unitB.mass || unitA.mass <= unitB.mass)
          )
            return commands;
          // Phantom units can push but not be pushed
          if (unitB.meta?.phantom) return commands;

          const dx = unitB.pos.x - unitA.pos.x;
          const dy = unitB.pos.y - unitA.pos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq > 0) {
            const dist = Math.sqrt(distSq);
            const pushX = (dx / dist) * 0.5;
            const pushY = (dy / dist) * 0.5;

            commands.push({
              type: "move",
              params: {
                unitId: unitB.id,
                dx: pushX,
                dy: pushY,
              },
            });
          }

          return commands;
        },
        1.1, // knockback range
        (a: Unit, b: Unit) => {
          // Filter: alive, have mass, and either different teams OR phantom pushing
          const differentTeams = a.team !== b.team;
          const phantomPushing = a.meta?.phantom === true;
          return (
            (differentTeams || phantomPushing) &&
            a.hp > 0 &&
            b.hp > 0 &&
            a.mass > 0 &&
            b.mass > 0
          );
        },
      );

      return this.commands;
    }

    // Fallback to direct implementation
    const knockbackRange = 1.1;
    const knockbackRangeSq = knockbackRange * knockbackRange;

    const arrays = context.getArrays();

    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 3 || arrays.mass[i] === 0) continue; // Skip dead or massless

      const x1 = arrays.posX[i];
      const y1 = arrays.posY[i];
      const team1 = arrays.team[i];
      const mass1 = arrays.mass[i];

      const coldDataI = context.getUnitColdDataByIndex(i);
      const phantomPushing = coldDataI?.meta?.phantom === true;

      for (const j of arrays.activeIndices) {
        if (i === j || arrays.state[j] === 3 || arrays.mass[j] === 0) continue;
        if (!phantomPushing && team1 === arrays.team[j]) continue; // Same team, no knockback (unless phantom)

        const dx = arrays.posX[j] - x1;
        const dy = arrays.posY[j] - y1;
        const distSq = dx * dx + dy * dy;

        if (distSq <= knockbackRangeSq && distSq > 0) {
          const mass2 = arrays.mass[j];
          const massDiff = mass1 - mass2;

          // Phantoms can push regardless of mass
          if (!phantomPushing && massDiff <= 0) continue;

          const coldData = context.getUnitColdDataByIndex(j);
          if (coldData?.meta?.phantom) continue; // Don't push other phantoms

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

    return this.commands;
  }
  // }
}
