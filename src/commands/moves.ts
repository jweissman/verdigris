import { Command } from "../rules/command";

/**
 * Batch move command - applies multiple unit movements in a single optimized pass
 * Much faster than individual move commands as it avoids proxy lookups
 */
export class MovesCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const moves = params.moves as Map<string, { dx: number; dy: number }>;
    if (!moves || moves.size === 0) return;

    const transform = this.sim.getTransform();
    const currentTick = this.sim.ticks;

    const updates: Array<{ id: string; changes: any }> = [];

    for (const [id, move] of moves) {
      const unit = this.sim.units.find((u: any) => u.id === id);
      if (!unit) continue;

      const movementRate =
        unit.meta?.movementRate || (unit.tags?.includes("hero") ? 1 : 2);
      const lastMoveTick = unit.meta?.lastMoveTick || 0;

      if (currentTick - lastMoveTick < movementRate) {
        continue;
      }

      let effectiveDx = move.dx;
      let effectiveDy = move.dy;

      if (unit.meta?.chilled) {
        const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
        effectiveDx *= slowFactor;
        effectiveDy *= slowFactor;
      }

      if (unit.meta?.stunned) {
        effectiveDx = 0;
        effectiveDy = 0;
      }

      let facing = unit.meta?.facing || "right";
      if (!unit.meta?.jumping && !unit.meta?.tossing && move.dx !== 0) {
        facing = move.dx > 0 ? "right" : "left";
      }

      updates.push({
        id,
        changes: {
          intendedMove: { x: effectiveDx, y: effectiveDy },
          meta: { ...unit.meta, facing, lastMoveTick: currentTick },
        },
      });
    }

    for (const update of updates) {
      transform.updateUnit(update.id, update.changes);
    }
  }
}
