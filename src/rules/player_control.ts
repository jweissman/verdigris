import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  private moveCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private jumpCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private commandBuffer: Map<string, QueuedCommand[]> = new Map(); // unitId -> buffered commands
  private readonly MOVE_COOLDOWN = 2; // Balanced movement at 30fps
  private readonly JUMP_COOLDOWN = 10; // Ticks between jump commands at 30fps
  
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
          // Calculate movement from held keys - support diagonal movement
          let dx = 0;
          let dy = 0;
          
          if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) {
            dy = -1;
          }
          if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) {
            dy = 1;
          }
          if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) {
            dx = -1;
          }
          if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) {
            dx = 1;
          }
          
          // Map diagonal movement to action
          let action = '';
          if (dx === -1 && dy === 0) action = 'left';
          else if (dx === 1 && dy === 0) action = 'right';
          else if (dx === 0 && dy === -1) action = 'up';
          else if (dx === 0 && dy === 1) action = 'down';
          else if (dx === -1 && dy === -1) action = 'up-left';
          else if (dx === 1 && dy === -1) action = 'up-right';
          else if (dx === -1 && dy === 1) action = 'down-left';
          else if (dx === 1 && dy === 1) action = 'down-right';
          
          if (action) {
            // Buffer the command if we're already moving
            const bufferedCommands = this.commandBuffer.get(unit.id) || [];
            if (bufferedCommands.length < 2) { // Keep a small buffer
              const command = {
                type: 'hero' as const,
                params: { action }
              };
              
              // Send immediately if no buffered commands
              if (bufferedCommands.length === 0) {
                console.log(`[PlayerControl] Sending hero ${action} command, unit at ${JSON.stringify(unit.pos)}`);
                commands.push(command);
                this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
              } else {
                // Add to buffer
                bufferedCommands.push(command);
                this.commandBuffer.set(unit.id, bufferedCommands);
              }
            }
          }
        } else {
          // Process buffered commands when cooldown expires
          const bufferedCommands = this.commandBuffer.get(unit.id) || [];
          if (cooldown === 1 && bufferedCommands.length > 0) {
            const nextCommand = bufferedCommands.shift();
            if (nextCommand) {
              commands.push(nextCommand);
              this.commandBuffer.set(unit.id, bufferedCommands);
            }
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