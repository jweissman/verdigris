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

      // Handle instant teleport
      if (params.teleport) {
        const updates: any = {
          pos: { x: newX, y: newY },
          intendedMove: { x: 0, y: 0 }, // No movement after teleport
        };

        if (!updates.meta) updates.meta = {};
        updates.meta.teleported = true; // Mark for renderer to skip interpolation

        if (params.z !== undefined) {
          updates.meta.z = params.z;
        }

        transform.updateUnit(targetId, updates);

        // Update lastUnitPositions to prevent interpolation
        this.sim.lastUnitPositions.set(targetId, {
          x: newX,
          y: newY,
          z: params.z || 0,
        } as any);

        return;
      }

      // Normal movement
      const dx = newX - unit.pos.x;
      const dy = newY - unit.pos.y;

      // Don't move if frozen or stunned (check cold data through proxyManager)
      const proxyManager = this.sim.getProxyManager();
      const meta = proxyManager.getMeta(targetId);
      const isFrozen = meta?.frozen;
      const isStunned = meta?.stunned;

      if (isFrozen || isStunned) {
        // Set intended move to 0 to ensure no movement
        transform.updateUnit(targetId, {
          intendedMove: { x: 0, y: 0 },
        });
        return;
      }

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

      // Check cold data for frozen/stunned status through proxyManager
      const proxyManager = this.sim.getProxyManager();
      const meta = proxyManager.getMeta(targetId);
      const isFrozen = meta?.frozen;
      const isStunned = meta?.stunned;

      if (isStunned || isFrozen) {
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
