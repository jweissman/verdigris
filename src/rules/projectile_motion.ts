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
      // Special handling for grapple projectiles
      if (projectile.type === 'grapple') {
        // Check collision with any unit (friendly or enemy)
        for (const unit of units) {
          if (unit.hp > 0) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (projectile.radius || 1)) {
              // Grapple hit! Set metadata for GrapplingPhysics to process
              context.queueCommand({
                type: 'meta',
                params: {
                  unitId: unit.id,
                  meta: {
                    grappleHit: true,
                    grapplerID: projectile.sourceId || 'unknown',
                    grappleOrigin: { ...projectile.pos }
                  }
                }
              });
              
              // Remove the grapple projectile
              context.queueCommand({
                type: 'removeProjectile',
                params: { id: projectile.id }
              });
              break;
            }
          }
        }
      } else {
        // Normal projectile handling (damage)
        for (const unit of units) {
          if (unit.team !== projectile.team && unit.hp > 0) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const collisionRadius = projectile.radius !== undefined ? projectile.radius : 1;
            
            if (distance < collisionRadius) {
              // Hit! Queue damage command directly
              
              // Queue damage command
              context.queueCommand({
                type: 'damage',
                params: {
                  targetId: unit.id,
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
      }
      
      // Check if bomb should explode (either lifetime expired or impact)
      if (projectile.type === 'bomb' && projectile.lifetime && projectile.lifetime >= 30) {
        // Queue direct damage commands for units in explosion radius
        const units = context.getAllUnits();
        const explosionRadius = projectile.explosionRadius || 3;
        const explosionDamage = projectile.damage || 20;
        
        for (const unit of units) {
          if (unit.team !== projectile.team) {
            const dx = unit.pos.x - projectile.pos.x;
            const dy = unit.pos.y - projectile.pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= explosionRadius) {
              // Apply falloff
              const damageMultiplier = Math.max(0.3, 1 - (distance / explosionRadius) * 0.5);
              const damage = Math.floor(explosionDamage * damageMultiplier);
              
              if (damage > 0) {
                context.queueCommand({
                  type: 'damage',
                  params: {
                    targetId: unit.id,
                    amount: damage,
                    aspect: 'explosion'
                  }
                });
                
                // Queue knockback command
                const knockbackForce = 2;
                const knockbackX = dx !== 0 ? (dx / Math.abs(dx)) * knockbackForce : 0;
                const knockbackY = dy !== 0 ? (dy / Math.abs(dy)) * knockbackForce : 0;
                
                context.queueCommand({
                  type: 'move',
                  params: {
                    unitId: unit.id,
                    x: unit.pos.x + knockbackX,
                    y: unit.pos.y + knockbackY
                  }
                });
              }
            }
          }
        }
        
        // Queue command to remove projectile
        context.queueCommand({
          type: 'removeProjectile',
          params: { id: projectile.id }
        });
      }
    }
  }
}