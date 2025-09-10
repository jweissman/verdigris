import { Rule } from "./rule";
import { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Simple AI rule that makes units with attack abilities target enemies
 */
export class SimpleAI extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();
    
    // Get all units that should have AI behavior (mages, archers, etc)
    const aiUnits = allUnits.filter(u => 
      u.hp > 0 && 
      !u.meta?.controlled && // Not player controlled
      (u.type === "mage" || u.type === "archer" || u.tags?.includes("ai"))
    );
    
    aiUnits.forEach(unit => {
      // Check cooldown
      const currentTick = context.getCurrentTick();
      const lastAttack = unit.meta?.lastAIAttack || 0;
      
      // Different cooldowns for different unit types
      const cooldownMap: Record<string, number> = {
        mage: 30,
        archer: 20,
        default: 25
      };
      
      const cooldown = cooldownMap[unit.type || "default"] || 25;
      
      if (currentTick - lastAttack <= cooldown) return;
      
      // Find enemies
      const enemies = allUnits.filter(u => 
        u.team !== unit.team && 
        u.team !== "neutral" &&
        u.hp > 0
      );
      
      if (enemies.length === 0) return;
      
      // Find closest enemy
      let closestEnemy = enemies[0];
      let minDist = Infinity;
      
      enemies.forEach(enemy => {
        const dx = Math.abs(enemy.pos.x - unit.pos.x);
        const dy = Math.abs(enemy.pos.y - unit.pos.y);
        const dist = dx + dy; // Manhattan distance
        
        if (dist < minDist) {
          minDist = dist;
          closestEnemy = enemy;
        }
      });
      
      // Check range
      const attackRange = unit.type === "mage" ? 12 : 8;
      
      if (closestEnemy && minDist <= attackRange) {
        // Choose attack based on unit type
        if (unit.type === "mage") {
          commands.push({
            type: "bolt",
            unitId: unit.id,
            params: {
              x: closestEnemy.pos.x,
              y: closestEnemy.pos.y,
            }
          });
        } else if (unit.type === "archer") {
          commands.push({
            type: "projectile",
            unitId: unit.id,
            params: {
              x: unit.pos.x,
              y: unit.pos.y,
              targetX: closestEnemy.pos.x,
              targetY: closestEnemy.pos.y,
              projectileType: "arrow",
              damage: unit.dmg || 10,
              team: unit.team,
            }
          });
        } else {
          // Default melee attack if close enough
          if (minDist <= 2) {
            commands.push({
              type: "strike",
              unitId: unit.id,
              params: {
                direction: closestEnemy.pos.x > unit.pos.x ? "right" : "left",
                damage: unit.dmg || 5,
              }
            });
          }
        }
        
        // Update attack time
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              lastAIAttack: currentTick
            }
          }
        });
      } else if (minDist > attackRange && minDist < 20) {
        // Move towards enemy if out of range but not too far
        const dx = Math.sign(closestEnemy.pos.x - unit.pos.x);
        const dy = Math.sign(closestEnemy.pos.y - unit.pos.y);
        
        if (dx !== 0 || dy !== 0) {
          commands.push({
            type: "move",
            unitId: unit.id,
            params: {
              dx,
              dy
            }
          });
        }
      }
    });
    
    return commands;
  }
}