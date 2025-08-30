import { Command, CommandParams } from "../rules/command";

/**
 * MoveTarget command - sets a target position for a unit to move to
 * The unit will pathfind and move towards this target over multiple ticks
 * Params:
 *   x: number - Target x coordinate
 *   y: number - Target y coordinate
 *   attackMove?: boolean - Whether to attack enemies along the way
 */
export class MoveTargetCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;

    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit) return;

    const targetX = params.x as number;
    const targetY = params.y as number;
    const attackMove = (params.attackMove as boolean) || false;

    if (!unit.meta) unit.meta = {};

    unit.meta.moveTarget = {
      x: targetX,
      y: targetY,
      attackMove: attackMove,
      setTick: this.sim.ticks,
    };

    unit.meta.currentPath = null;
  }
}
