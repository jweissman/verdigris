import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export default class Cleanup extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    // Remove dead units
    const deadUnits = context
      .getAllUnits()
      .filter((unit) => unit.state === "dead" || unit.hp <= 0);

    deadUnits.forEach((unit) => {
      commands.push({
        type: "remove",
        params: { unitId: unit.id },
      });
    });
    
    // Handle effect units with lifetime
    const effectUnits = context
      .getAllUnits()
      .filter((unit) => unit.meta?.lifetime !== undefined && unit.meta.lifetime > 0);
      
    effectUnits.forEach((unit) => {
      const newLifetime = unit.meta.lifetime - 1;
      if (newLifetime <= 0) {
        commands.push({
          type: "remove",
          params: { unitId: unit.id }
        });
      } else {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              lifetime: newLifetime
            }
          }
        });
      }
    });

    return commands;
  }
}
