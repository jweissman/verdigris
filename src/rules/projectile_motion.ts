import { Rule } from "./rule";
import type { TickContext } from '../core/tick_context';

/**
 * ProjectileMotion - handles collision detection and damage events for projectiles
 * The actual movement is handled by ForcesCommand for performance
 */
export class ProjectileMotion extends Rule {
  execute(context: TickContext): void {
    const projectiles = context.getProjectiles();
    const units = context.getAllUnits();
    
    for (const projectile of projectiles) {
      // Check collision with units
      for (const unit of units) {
        if (unit.team !== projectile.team && unit.hp > 0) {
          const dx = unit.pos.x - projectile.pos.x;
          const dy = unit.pos.y - projectile.pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < (projectile.radius || 1)) {
            // Hit! Queue damage event
            context.queueEvent({
              kind: 'damage',
              source: projectile.id || 'projectile',
              target: unit.id,
              meta: {
                amount: projectile.damage || 10,
                aspect: projectile.aspect || 'physical',
                origin: projectile.pos
              }
            });
            
            // Queue command to remove projectile
            context.queueCommand({
              type: 'removeProjectile', 
              params: { id: projectile.id }
            });
            break;
          }
        }
      }
      
      // Check if bomb should explode
      if (projectile.type === 'bomb' && projectile.lifetime && projectile.lifetime > 30) {
        // Queue AoE damage event
        context.queueEvent({
          kind: 'aoe',
          source: projectile.id || 'bomb',
          target: projectile.pos,
          meta: {
            amount: projectile.damage || 20,
            radius: projectile.explosionRadius || 3,
            aspect: 'explosion'
          }
        });
        
        // Queue command to remove projectile
        context.queueCommand({
          type: 'removeProjectile',
          params: { id: projectile.id }
        });
      }
    }
  }
}