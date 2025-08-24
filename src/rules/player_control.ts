import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

export class PlayerControl extends Rule {
  private keysHeld: Set<string> = new Set();
  private moveCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private jumpCooldowns: Map<string, number> = new Map(); // unitId -> remaining ticks
  private commandBuffer: Map<string, QueuedCommand[]> = new Map(); // unitId -> buffered commands
  private readonly MOVE_COOLDOWN = 1; // No cooldown for smoothest movement
  private readonly JUMP_COOLDOWN = 15; // Reasonable jump cooldown
  private moveTarget: { x: number; y: number } | null = null;
  private attackMoveTarget: { x: number; y: number } | null = null;
  
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
  
  setMoveTarget(target: { x: number; y: number }) {
    this.moveTarget = target;
    this.attackMoveTarget = null;
  }
  
  setAttackMoveTarget(target: { x: number; y: number }) {
    this.attackMoveTarget = target;
    this.moveTarget = null;
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
        // Handle click-to-move
        if (this.moveTarget || this.attackMoveTarget) {
          const target = this.moveTarget || this.attackMoveTarget;
          if (target) {
            const dx = target.x - unit.pos.x;
            const dy = target.y - unit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.5) {
              // Move towards target
              const cooldown = this.moveCooldowns.get(unit.id) || 0;
              if (cooldown <= 0) {
                const moveX = Math.sign(dx);
                const moveY = Math.sign(dy);
                
                // Update facing
                if (moveX !== 0) {
                  unit.meta = unit.meta || {};
                  unit.meta.facing = moveX > 0 ? 'right' : 'left';
                }
                
                commands.push({
                  type: 'hero' as const,
                  params: {
                    action: this.getMoveAction(moveX, moveY)
                  }
                });
                this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
              }
            } else {
              // Reached target
              this.moveTarget = null;
              this.attackMoveTarget = null;
            }
            
            // Attack-move: look for enemies near path
            if (this.attackMoveTarget) {
              const enemies = allUnits.filter(u => 
                u.team !== unit.team && 
                u.hp > 0 &&
                Math.abs(u.pos.x - unit.pos.x) < 2 &&
                Math.abs(u.pos.y - unit.pos.y) < 2
              );
              
              if (enemies.length > 0) {
                // Stop and attack
                this.attackMoveTarget = null;
                commands.push({
                  type: 'strike',
                  unitId: unit.id,
                  params: {
                    targetId: enemies[0].id
                  }
                });
              }
            }
            continue; // Skip keyboard controls when using click-to-move
          }
        }
        
        // Check cooldown
        const cooldown = this.moveCooldowns.get(unit.id) || 0;
        
        if (cooldown <= 0) {
          // Calculate movement from held keys - support diagonal movement
          let dx = 0;
          let dy = 0;
          
          // Smoother movement increments
          const moveSpeed = 0.25; // Quarter tile per update for smoothness
          
          if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) {
            dy = -moveSpeed;
          }
          if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) {
            dy = moveSpeed;
          }
          if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) {
            dx = -moveSpeed;
            // Update facing direction
            if (!unit.meta) unit.meta = {};
            unit.meta.facing = 'left';
          }
          if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) {
            dx = moveSpeed;
            // Update facing direction
            if (!unit.meta) unit.meta = {};
            unit.meta.facing = 'right';
          }
          
          // Map diagonal movement to action
          let action = '';
          if (dx < 0 && dy === 0) action = 'left';
          else if (dx > 0 && dy === 0) action = 'right';
          else if (dx === 0 && dy < 0) action = 'up';
          else if (dx === 0 && dy > 0) action = 'down';
          else if (dx < 0 && dy < 0) action = 'up-left';
          else if (dx > 0 && dy < 0) action = 'up-right';
          else if (dx < 0 && dy > 0) action = 'down-left';
          else if (dx > 0 && dy > 0) action = 'down-right';
          
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
        
        // Reset jump count when on ground for a while
        if (!unit.meta?.jumping && unit.meta?.jumpResetTime && 
            context.getCurrentTick() >= unit.meta.jumpResetTime) {
          commands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                jumpCount: 0,
                jumpResetTime: null
              }
            }
          });
        }
        
        // Handle jump
        const jumpCooldown = this.jumpCooldowns.get(unit.id) || 0;
        if (this.keysHeld.has(' ') && !unit.meta?.jumping && jumpCooldown <= 0) {
          // Check for multiple jumps - double and triple jumps!
          const isHero = unit.tags?.includes('hero');
          const jumpCount = unit.meta?.jumpCount || 0;
          const maxJumps = isHero ? 3 : 1; // Heroes can triple jump!
          
          if (jumpCount < maxJumps) {
            const jumpPower = 1 + jumpCount * 0.5; // Each jump is more powerful
            const jumpDistance = Math.min(5, 2 + jumpCount); // Distance increases
            
            commands.push({
              type: 'jump',
              unitId: unit.id,
              params: {
                distance: jumpDistance,
                height: isHero ? Math.floor(6 * jumpPower) : 5,
                damage: isHero ? Math.floor(15 * jumpPower) : 0, // More damage per jump
                radius: isHero ? 2 + jumpCount : 0 // Bigger AOE for multi-jumps
              }
            });
            
            // Update jump count and reset timer
            commands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  jumpCount: jumpCount + 1,
                  jumpResetTime: context.getCurrentTick() + 30 // Reset after 30 ticks on ground
                }
              }
            });
          }
          
          // Set jump cooldown
          this.jumpCooldowns.set(unit.id, this.JUMP_COOLDOWN);
        }
        
        // Handle strike/attack - use hero command
        if (this.keysHeld.has('e') || this.keysHeld.has('enter')) {
          const strikeCooldown = unit.meta?.lastStrike ? context.getCurrentTick() - unit.meta.lastStrike : 999;
          if (strikeCooldown > 8) { // 8 tick cooldown for strikes
            commands.push({
              type: 'hero',
              params: {
                action: 'attack',
                direction: unit.meta?.facing || 'right',
                range: 2
              }
            });
            // Update last strike time
            unit.meta = unit.meta || {};
            unit.meta.lastStrike = context.getCurrentTick();
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
  
  private getMoveAction(dx: number, dy: number): string {
    if (dx === -1 && dy === 0) return 'left';
    if (dx === 1 && dy === 0) return 'right';
    if (dx === 0 && dy === -1) return 'up';
    if (dx === 0 && dy === 1) return 'down';
    if (dx === -1 && dy === -1) return 'up-left';
    if (dx === 1 && dy === -1) return 'up-right';
    if (dx === -1 && dy === 1) return 'down-left';
    if (dx === 1 && dy === 1) return 'down-right';
    return 'left'; // Default
  }
}