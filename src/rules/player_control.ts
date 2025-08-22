import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  
  constructor() {
    super();
  }
  
  setKeyState(key: string, pressed: boolean) {
    if (pressed) {
      this.keysHeld.add(key.toLowerCase());
    } else {
      this.keysHeld.delete(key.toLowerCase());
    }
  }
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();
    
    // Find player-controlled units
    for (const unit of allUnits) {
      if (unit.meta?.controlled || unit.tags?.includes('hero')) {
        // Only move if unit is not already moving
        if (unit.intendedMove.x === 0 && unit.intendedMove.y === 0) {
          // Calculate movement from held keys
          let action = '';
          
          if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) {
            action = 'up';
          } else if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) {
            action = 'down';
          } else if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) {
            action = 'left';
          } else if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) {
            action = 'right';
          }
          
          if (action) {
            commands.push({
              type: 'hero',
              params: { action }
            });
          }
        }
        
        // Handle jump
        if (this.keysHeld.has(' ') && !unit.meta?.jumping) {
          commands.push({
            type: 'jump',
            unitId: unit.id,
            params: {
              distance: 3,
              height: 5
            }
          });
        }
      }
    }
    
    return commands;
  }
}