import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  
  constructor() {
    super();
    
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        this.keysHeld.add(e.key.toLowerCase());
      });
      
      document.addEventListener('keyup', (e) => {
        this.keysHeld.delete(e.key.toLowerCase());
      });
    }
  }
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();
    
    // Find player-controlled units
    for (const unit of allUnits) {
      if (unit.meta?.controlled || unit.tags?.includes('hero')) {
        // Calculate movement from held keys
        let dx = 0;
        let dy = 0;
        
        // Faster movement speed
        if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) dy = -1;
        if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) dy = 1;
        if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) dx = -1;
        if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) dx = 1;
        
        if (dx !== 0 || dy !== 0) {
          commands.push({
            type: 'move',
            unitId: unit.id,
            params: { dx, dy }
          });
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