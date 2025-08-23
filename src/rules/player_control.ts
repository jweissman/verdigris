import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  private moveCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private jumpCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private readonly MOVE_COOLDOWN = 4; // Ticks between movement commands
  private readonly JUMP_COOLDOWN = 10; // Ticks between jump commands
  
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
    
    // Update cooldowns
    for (const [unitId, cooldown] of this.moveCooldowns.entries()) {
      if (cooldown > 0) {
        this.moveCooldowns.set(unitId, cooldown - 1);
      }
    }
    
    for (const [unitId, cooldown] of this.jumpCooldowns.entries()) {
      if (cooldown > 0) {
        this.jumpCooldowns.set(unitId, cooldown - 1);
      }
    }
    
    // Find player-controlled units
    for (const unit of allUnits) {
      if (unit.meta?.controlled || unit.tags?.includes('hero')) {
        // Check cooldown
        const cooldown = this.moveCooldowns.get(unit.id) || 0;
        
        if (cooldown <= 0) {
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
            console.log(`[PlayerControl] Sending hero ${action} command, unit at ${JSON.stringify(unit.pos)}`);
            commands.push({
              type: 'hero',
              params: { action }
            });
            
            // Set cooldown
            this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
          }
        }
        
        // Handle jump
        const jumpCooldown = this.jumpCooldowns.get(unit.id) || 0;
        if (this.keysHeld.has(' ') && !unit.meta?.jumping && jumpCooldown <= 0) {
          commands.push({
            type: 'jump',
            unitId: unit.id,
            params: {
              distance: 3,
              height: 5
            }
          });
          
          // Set jump cooldown
          this.jumpCooldowns.set(unit.id, this.JUMP_COOLDOWN);
        }
        
        // Handle strike/attack
        if (this.keysHeld.has('e') || this.keysHeld.has('enter')) {
          const strikeCooldown = unit.meta?.lastStrike ? context.getCurrentTick() - unit.meta.lastStrike : 999;
          if (strikeCooldown > 8) { // 8 tick cooldown for strikes
            commands.push({
              type: 'strike',
              unitId: unit.id,
              params: {
                direction: unit.meta?.facing || 'right',
                range: 2
              }
            });
          }
        }
        
        // Handle weapon switching (1-6 keys)
        const weaponTypes = ['sword', 'spear', 'axe', 'bow', 'shield', 'staff'];
        for (let i = 0; i < weaponTypes.length; i++) {
          const key = (i + 1).toString();
          if (this.keysHeld.has(key)) {
            commands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  ...unit.meta,
                  weapon: weaponTypes[i]
                }
              }
            });
            console.log(`[PlayerControl] Switching to ${weaponTypes[i]}`);
          }
        }
      }
    }
    
    return commands;
  }
}