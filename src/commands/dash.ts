import { Command, CommandParams } from "../rules/command";

/**
 * Dash command - Hero dashes forward quickly
 * Can dash toward enemies for auto-targeting
 * Params:
 *   distance?: number - Dash distance (default 8)
 *   damage?: number - Impact damage if hitting enemy (default 10)
 *   invulnerable?: boolean - Invulnerable during dash (default true)
 *   targetEnemy?: boolean - Auto-target nearest enemy (default true)
 *   afterimage?: boolean - Create afterimage trail (default true)
 */
export class Dash extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    
    const hero = this.sim.units.find(u => u.id === unitId);
    if (!hero) return;
    
    const distance = (params.distance as number) || 8;
    const damage = (params.damage as number) || 10;
    const invulnerable = params.invulnerable !== false;
    const targetEnemy = params.targetEnemy !== false;
    const afterimage = params.afterimage !== false;
    
    // Check if dash is on cooldown
    const lastDash = hero.meta?.lastDashTime || 0;
    const dashCooldown = 30; // 30 ticks cooldown
    if (this.sim.ticks - lastDash < dashCooldown) {
      console.log('[Dash] Dash on cooldown');
      return;
    }
    
    let targetX = hero.pos.x;
    let targetY = hero.pos.y;
    let dashToEnemy = false;
    
    // Auto-target nearest enemy if enabled
    if (targetEnemy) {
      const enemies = this.sim.units.filter(u => 
        u.team !== hero.team && 
        u.hp > 0 &&
        Math.abs(u.pos.x - hero.pos.x) <= distance + 2 &&
        Math.abs(u.pos.y - hero.pos.y) <= 3
      );
      
      if (enemies.length > 0) {
        // Find nearest enemy
        enemies.sort((a, b) => {
          const distA = Math.abs(a.pos.x - hero.pos.x) + Math.abs(a.pos.y - hero.pos.y);
          const distB = Math.abs(b.pos.x - hero.pos.x) + Math.abs(b.pos.y - hero.pos.y);
          return distA - distB;
        });
        
        const target = enemies[0];
        targetX = target.pos.x;
        targetY = target.pos.y;
        dashToEnemy = true;
        
        console.log(`[Dash] Auto-targeting enemy at (${targetX}, ${targetY})`);
      }
    }
    
    // If no enemy target, dash in facing direction
    if (!dashToEnemy) {
      const facing = hero.meta?.facing || 'right';
      targetX = hero.pos.x + (facing === 'right' ? distance : -distance);
      targetY = hero.pos.y;
      
      // Clamp to field bounds
      targetX = Math.max(0, Math.min(this.sim.fieldWidth - 1, targetX));
    }
    
    // Calculate dash path
    const startX = hero.pos.x;
    const startY = hero.pos.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const totalDist = Math.sqrt(dx * dx + dy * dy);
    
    if (totalDist === 0) return;
    
    // Create afterimage trail
    if (afterimage) {
      const numAfterimages = 5;
      for (let i = 0; i < numAfterimages; i++) {
        const progress = i / numAfterimages;
        const imageX = startX + (dx * progress);
        const imageY = startY + (dy * progress);
        
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            pos: {
              x: imageX * 8 + 4,
              y: imageY * 8 + 4,
            },
            vel: { x: 0, y: 0 },
            lifetime: 10 - i * 2, // Fade out
            type: "afterimage",
            color: "#4169E1", // Royal blue
            radius: 4,
            z: 10 - i,
            sprite: hero.sprite, // Use hero's sprite for afterimage
            alpha: 0.3 - i * 0.05
          }
        });
      }
    }
    
    // Move hero instantly to target
    this.sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: unitId,
        x: targetX,
        y: targetY
      }
    });
    
    // Update facing direction
    if (dx !== 0) {
      this.sim.queuedCommands.push({
        type: "meta",
        params: {
          unitId: unitId,
          meta: {
            ...hero.meta,
            facing: dx > 0 ? 'right' : 'left',
            lastDashTime: this.sim.ticks
          }
        }
      });
    }
    
    // Apply invulnerability
    if (invulnerable) {
      this.sim.queuedCommands.push({
        type: "applyStatusEffect",
        params: {
          targetId: unitId,
          effect: "invulnerable",
          duration: 10
        }
      });
    }
    
    // Deal damage if dashing to enemy
    if (dashToEnemy && damage > 0) {
      // Find enemies at destination
      const hitEnemies = this.sim.units.filter(u => 
        u.team !== hero.team &&
        u.hp > 0 &&
        Math.abs(u.pos.x - targetX) <= 1 &&
        Math.abs(u.pos.y - targetY) <= 1
      );
      
      for (const enemy of hitEnemies) {
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: enemy.id,
            amount: damage,
            source: unitId,
            aspect: "kinetic"
          }
        });
        
        // Small knockback
        const knockX = enemy.pos.x - startX;
        const knockY = enemy.pos.y - startY;
        const knockDist = Math.sqrt(knockX * knockX + knockY * knockY);
        
        if (knockDist > 0) {
          this.sim.queuedCommands.push({
            type: "knockback",
            params: {
              targetId: enemy.id,
              force: 3,
              direction: {
                x: knockX / knockDist * 3,
                y: knockY / knockDist * 3
              }
            }
          });
        }
      }
    }
    
    // Visual effects
    
    // Create dash trail
    for (let i = 0; i < 10; i++) {
      const progress = i / 10;
      const trailX = startX + (dx * progress);
      const trailY = startY + (dy * progress);
      
      this.sim.queuedCommands.push({
        type: "particle",
        params: {
          pos: {
            x: trailX * 8 + 4 + (Math.random() - 0.5) * 4,
            y: trailY * 8 + 4 + (Math.random() - 0.5) * 4,
          },
          vel: {
            x: (Math.random() - 0.5) * 2,
            y: -Math.random() * 2,
          },
          lifetime: 15 + Math.random() * 10,
          type: "energy",
          color: "#00BFFF", // Deep sky blue
          radius: 0.5 + Math.random() * 0.5,
          z: 3,
        }
      });
    }
    
    // Impact burst at destination
    if (dashToEnemy) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        this.sim.queuedCommands.push({
          type: "particle",
          params: {
            pos: {
              x: targetX * 8 + 4,
              y: targetY * 8 + 4,
            },
            vel: {
              x: Math.cos(angle) * 3,
              y: Math.sin(angle) * 3,
            },
            lifetime: 20,
            type: "impact",
            color: "#FFD700", // Gold
            radius: 1.5,
            z: 5,
          }
        });
      }
    }
    
    // Play dash sound
    this.sim.queuedCommands.push({
      type: "particle",
      params: {
        type: "sound",
        sound: "dash",
        volume: 0.8
      }
    });
    
    console.log(`[Dash] Hero ${unitId} dashes from (${startX}, ${startY}) to (${targetX}, ${targetY})`);
  }
}