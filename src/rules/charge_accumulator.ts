import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class ChargeAccumulator extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const units = context.getAllUnits();
    
    for (const unit of units) {
      // Check if unit is charging attack (based on meta flag, not state)
      if (unit.meta?.chargingAttack) {
        const currentCharge = unit.meta.attackCharge || 0;
        
        // Accumulate charge up to max of 5
        if (currentCharge < 5) {
          commands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                attackCharge: currentCharge + 1,
                chargingAttack: true // Keep the flag
              }
            }
          });
        }
      }
    }
    
    return commands;
  }
}