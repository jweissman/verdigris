import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class ChainWeaponPhysics extends Rule {
  private lastSwingTick: Map<string, number> = new Map();
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();
    
    // No longer need to update physics - ball is a real unit now
    
    // Find heroes with chain weapons and allow them to swing
    const heroes = context.getAllUnits().filter(u => 
      u.tags?.includes("hero") && u.meta?.chainWeapon
    );
    
    for (const hero of heroes) {
      const lastSwing = this.lastSwingTick.get(hero.id) || 0;
      const timeSinceSwing = currentTick - lastSwing;
      
      // Check if hero just started an attack
      const justAttacked = hero.meta?.attackStartTick === currentTick;
      
      // Strong swing when attacking
      if (justAttacked && timeSinceSwing > 3) {
        // Big swing at start of attack
        commands.push({
          type: "chain_weapon",
          unitId: hero.id,
          params: {
            action: "swing",
            direction: hero.meta?.facing || "right",
            power: 25, // Very strong throw for attack - should reach 8-10 tiles
            isAttack: true
          }
        });
        this.lastSwingTick.set(hero.id, currentTick);
      }
      
      // Check for collisions with the ball unit
      const ballId = hero.meta?.chainBallId;
      if (ballId) {
        const ball = context.getAllUnits().find(u => u.id === ballId);
        if (ball && ball.intendedMove) {
          const speed = Math.sqrt(
            ball.intendedMove.x * ball.intendedMove.x + 
            ball.intendedMove.y * ball.intendedMove.y
          );
          
          if (speed > 2) {
            // Ball is moving, check for impacts
            commands.push({
              type: "chain_weapon",
              unitId: hero.id,
              params: {
                action: "swing",
                direction: hero.meta?.facing || "right",
                power: 0, // Just check collisions, don't add force
                isAttack: false
              }
            });
          }
        }
      }
    }
    
    return commands;
  }
}