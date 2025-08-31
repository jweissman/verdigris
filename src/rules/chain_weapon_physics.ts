import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class ChainWeaponPhysics extends Rule {
  private lastSwingTick: Map<string, number> = new Map();
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    
    // Update all chain weapons physics every tick
    commands.push({
      type: "chain_weapon",
      params: {
        action: "update"
      }
    });
    
    // Find heroes with chain weapons and allow them to swing
    const heroes = context.getAllUnits().filter(u => 
      u.tags?.includes("hero") && u.meta?.chainWeapon
    );
    
    for (const hero of heroes) {
      const lastSwing = this.lastSwingTick.get(hero.id) || 0;
      const timeSinceSwing = currentTick - lastSwing;
      
      // Auto-swing when attacking or every so often for visual effect
      if (hero.state === "attack" || 
          (hero.meta?.attackStartTick && currentTick - hero.meta.attackStartTick < 10)) {
        // Swing during attack
        if (timeSinceSwing > 5) { // Don't swing too frequently
          commands.push({
            type: "chain_weapon",
            unitId: hero.id,
            params: {
              action: "swing",
              direction: hero.meta?.facing || "right",
              power: 10
            }
          });
          this.lastSwingTick.set(hero.id, currentTick);
        }
      } else if (hero.intendedMove?.x !== 0 || hero.intendedMove?.y !== 0) {
        // Small swing while moving for visual effect
        if (timeSinceSwing > 10) {
          commands.push({
            type: "chain_weapon",
            unitId: hero.id,
            params: {
              action: "swing",
              direction: hero.meta?.facing || "right",
              power: 3
            }
          });
          this.lastSwingTick.set(hero.id, currentTick);
        }
      }
    }
    
    return commands;
  }
}