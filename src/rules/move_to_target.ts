import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * MoveToTarget rule - handles units that have a moveTarget set
 * This rule makes units pathfind and move towards their target
 */
export class MoveToTarget extends Rule {
  private moveCooldowns: Map<string, number> = new Map();
  private readonly MOVE_COOLDOWN = 3;
  
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();
    const currentTick = context.getCurrentTick();
    
    // Update cooldowns
    for (const [unitId, cooldown] of this.moveCooldowns.entries()) {
      if (cooldown > 0) {
        this.moveCooldowns.set(unitId, cooldown - 1);
      }
    }
    
    for (const unit of allUnits) {
      if (!unit.meta?.moveTarget) continue;
      if (unit.hp <= 0) continue;
      
      const target = unit.meta.moveTarget;
      const dx = target.x - unit.pos.x;
      const dy = target.y - unit.pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if we've reached the target
      if (distance < 0.5) {
        // Clear the move target
        commands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              moveTarget: null,
              currentPath: null
            }
          }
        });
        continue;
      }
      
      // Check cooldown
      const cooldown = this.moveCooldowns.get(unit.id) || 0;
      if (cooldown > 0) continue;
      
      // Attack-move: check for enemies
      if (target.attackMove) {
        const enemies = allUnits.filter(u => 
          u.team !== unit.team && 
          u.hp > 0 &&
          Math.abs(u.pos.x - unit.pos.x) < 2 &&
          Math.abs(u.pos.y - unit.pos.y) < 2
        );
        
        if (enemies.length > 0) {
          // Stop and attack
          commands.push({
            type: 'strike',
            unitId: unit.id,
            params: {
              targetId: enemies[0].id
            }
          });
          
          // Clear move target when engaging
          commands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                ...unit.meta,
                moveTarget: null
              }
            }
          });
          continue;
        }
      }
      
      // Simple pathfinding - move towards target
      const moveX = Math.sign(dx);
      const moveY = Math.sign(dy);
      
      // Update facing direction
      if (moveX !== 0) {
        commands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              facing: moveX > 0 ? 'right' : 'left'
            }
          }
        });
      }
      
      // Issue move command
      commands.push({
        type: 'move',
        params: {
          unitId: unit.id,
          dx: moveX,
          dy: moveY
        }
      });
      
      this.moveCooldowns.set(unit.id, this.MOVE_COOLDOWN);
    }
    
    return commands;
  }
}