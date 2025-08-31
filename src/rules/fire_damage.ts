import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * FireDamage rule - applies fire damage to units standing on hot tiles
 */
export class FireDamage extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    
    for (const unit of context.getAllUnits()) {
      if (unit.hp <= 0) continue;
      
      // Heroes don't take damage from environmental fire (they're fire-resistant)
      if (unit.tags?.includes("hero")) continue;
      
      const temp = context.getTemperatureAt(unit.pos.x, unit.pos.y);
      
      // Units take fire damage when standing on tiles > 100°C
      if (temp > 100) {
        const damage = Math.max(1, Math.floor((temp - 100) / 200)); // At least 1 damage per 200°C above 100
        
        commands.push({
          type: "damage",
          params: {
            targetId: unit.id,
            amount: Math.max(1, damage),
            aspect: "fire",
            source: "environment",
          },
        });
        
        // Apply burning status effect
        commands.push({
          type: "applyStatusEffect",
          params: {
            targetId: unit.id,
            effect: "burning",
            duration: 30,
          },
        });
      }
    }
    
    return commands;
  }
}