import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Clears the teleported flag after a few ticks to restore normal interpolation
 */
export class ClearTeleportFlag extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const units = context.getAllUnits();
    const currentTick = context.getCurrentTick();
    
    for (const unit of units) {
      // Clear teleported flag after 1 tick (just enough for renderer to skip interpolation once)
      if (unit.meta?.teleported && unit.meta?.teleportedAtTick) {
        const ticksSinceTeleport = currentTick - unit.meta.teleportedAtTick;
        
        if (ticksSinceTeleport >= 1) {
          
          // Set teleported to undefined so Transform will delete it
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                teleported: undefined
              }
            }
          });
        }
      }
    }
    
    return commands;
  }
}