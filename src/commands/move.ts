import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class MoveCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = unitId || (params.unitId as string);

    if (!targetId) return;

    const transform = this.sim.getTransform();
    const unit = this.sim.units.find((u) => u.id === targetId);
    if (!unit) return;

    let newX: number, newY: number;

    if (params.x !== undefined && params.y !== undefined) {
      newX = params.x as number;
      newY = params.y as number;
    } else {
      const dx = (params.dx as number) || 0;
      const dy = (params.dy as number) || 0;

      let effectiveDx = dx;
      let effectiveDy = dy;

      if (unit.meta.chilled) {
        const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
        effectiveDx *= slowFactor;
        effectiveDy *= slowFactor;
      }

      if (unit.meta.stunned) {
        effectiveDx = 0;
        effectiveDy = 0;
      }

      newX = unit.pos.x + effectiveDx;
      newY = unit.pos.y + effectiveDy;
    }

    newX = Math.max(0, Math.min(this.sim.fieldWidth - 1, newX));
    newY = Math.max(0, Math.min(this.sim.fieldHeight - 1, newY));

    let facing = unit.meta.facing || "right";
    if (!unit.meta.jumping && !unit.meta.tossing && params.dx !== undefined) {
      const dx = params.dx as number;
      if (dx > 0) {
        facing = "right";
      } else if (dx < 0) {
        facing = "left";
      }
    }

    let metaUpdates = { ...unit.meta, facing };

    if (params.z !== undefined) {
      metaUpdates.z = params.z as number;
    }

    transform.updateUnit(targetId, {
      pos: { x: newX, y: newY },
      intendedMove: { x: 0, y: 0 }, // Clear intended move after applying
      meta: metaUpdates,
    });
  }
}
