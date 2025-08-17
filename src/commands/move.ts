import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class MoveCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = unitId || (params.unitId as string);

    if (!targetId) return;

    const transform = this.sim.getTransform();
    const unit = this.sim.units.find((u) => u.id === targetId);
    if (!unit) return;


    if (params.x !== undefined && params.y !== undefined) {
      const newX = params.x as number;
      const newY = params.y as number;
      const dx = newX - unit.pos.x;
      const dy = newY - unit.pos.y;
      
      const updates: any = {
        intendedMove: { x: dx, y: dy },
      };
      

      if (params.z !== undefined) {
        if (!updates.meta) updates.meta = {};
        updates.meta.z = params.z;
      }
      
      transform.updateUnit(targetId, updates);
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

      let facing = unit.meta.facing || "right";
      if (!unit.meta.jumping && !unit.meta.tossing && dx !== 0) {
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
        intendedMove: { x: effectiveDx, y: effectiveDy },
        meta: metaUpdates,
      });
    }
  }
}
