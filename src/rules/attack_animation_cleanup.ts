import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * AttackAnimationCleanup rule - handles resetting attack animations after they complete
 */
export class AttackAnimationCleanup extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    const allUnits = context.getAllUnits();
    
    for (const unit of allUnits) {
      // Check if unit is in attack state and animation should end
      if (unit.state === 'attack' && unit.meta?.attackEndTick) {
        if (currentTick >= unit.meta.attackEndTick) {
          // Reset to idle state
          commands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                attackStartTick: undefined,
                attackEndTick: undefined
              }
            }
          });
          
          // Actually reset the unit state directly
          const unitToReset = context.findUnitById(unit.id);
          if (unitToReset) {
            unitToReset.state = 'idle';
          }
        }
      }
    }
    
    return commands;
  }
}