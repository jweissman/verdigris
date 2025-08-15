import { Rule } from "./rule";
import type { TickContext } from '../core/tick_context';

export class AreaOfEffect extends Rule {
  constructor() {
    super();
  }

  execute(context: TickContext): void {
    // Note: TickContext doesn't expose projectiles directly
    // We'll need to handle AoE effects from queued events or unit metadata instead
    
    // Check for units with explosive or AoE metadata that need to trigger
    const unitsWithAoE = context.getAllUnits().filter(unit => 
      unit.meta?.exploding || unit.meta?.aoeEffect || unit.meta?.detonating
    );
    
    for (const explosiveUnit of unitsWithAoE) {
      if (explosiveUnit.meta?.exploding) {
        this.handleExplosion(context, explosiveUnit);
      }
      if (explosiveUnit.meta?.aoeEffect) {
        this.handleAoEEffect(context, explosiveUnit);
      }
    }
  }
  
  private handleExplosion(context: TickContext, explosiveUnit: any): void {
    const radius = explosiveUnit.meta.explosionRadius || 5;
    const damage = explosiveUnit.meta.explosionDamage || 5;
    
    for (const unit of context.getAllUnits()) {
      if (unit.team !== explosiveUnit.team && unit.state !== 'dead') {
        const dx = unit.pos.x - explosiveUnit.pos.x;
        const dy = unit.pos.y - explosiveUnit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          // Queue damage event
          context.queueEvent({
            kind: 'damage',
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              amount: damage,
              aspect: 'explosion'
            }
          });
          
          // Queue knockback event
          const knockback = 6.5;
          const nx = (dx / dist || 1) * knockback;
          const ny = (dy / dist || 1) * knockback;
          context.queueEvent({
            kind: 'knockback',
            source: explosiveUnit.id,
            target: unit.id,
            meta: {
              force: { x: nx, y: ny }
            }
          });
        }
      }
    }
    
    // Clear explosion flag
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: explosiveUnit.id,
        meta: {
          exploding: undefined,
          explosionRadius: undefined,
          explosionDamage: undefined
        }
      }
    });
  }
  
  private handleAoEEffect(context: TickContext, sourceUnit: any): void {
    const aoeData = sourceUnit.meta.aoeEffect;
    const radius = aoeData.radius || 3;
    const damage = aoeData.damage || 0;
    const effect = aoeData.effect || 'damage';
    
    for (const unit of context.getAllUnits()) {
      if (unit.team !== sourceUnit.team && unit.state !== 'dead') {
        const dx = unit.pos.x - sourceUnit.pos.x;
        const dy = unit.pos.y - sourceUnit.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          if (effect === 'damage' && damage > 0) {
            context.queueCommand({
              type: 'damage',
              params: {
                targetId: unit.id,
                amount: damage,
                aspect: aoeData.aspect || 'magic',
                sourceId: sourceUnit.id
              }
            });
          }
          
          if (aoeData.stun) {
            context.queueCommand({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  stunned: true,
                  stunDuration: aoeData.stunDuration || 10
                }
              }
            });
          }
        }
      }
    }
    
    // Clear AoE effect flag
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: sourceUnit.id,
        meta: {
          aoeEffect: undefined
        }
      }
    });
  }
}
