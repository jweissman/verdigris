import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * SetIntendedMove command - sets a unit's movement intention
 * This is distinct from actual movement (move command)
 * 
 * Params:
 *   unitId: string - ID of the unit
 *   dx: number - intended X movement (-1, 0, 1)
 *   dy: number - intended Y movement (-1, 0, 1)
 */
export class SetIntendedMoveCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.unitId as string || unitId;
    if (!targetId) return;
    
    const dx = params.dx as number || 0;
    const dy = params.dy as number || 0;
    
    const transform = this.sim.getTransform();
    transform.updateUnit(targetId, {
      intendedMove: { x: dx, y: dy }
    });
  }
}