import { Rule } from './rule';
import type { TickContext } from '../core/tick_context';
import { Abilities } from './abilities';

export class Jumping extends Rule {
  execute(context: TickContext): void {
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(context, unit);
      }
    }
  }

  private updateJump(context: TickContext, unit: any): void {
    const jumpDuration = Abilities.all.jumps?.config?.duration || 10; // ticks
    const newProgress = (unit.meta.jumpProgress || 0) + 1;

    if (newProgress >= jumpDuration) {
      // Landing - trigger AoE damage if configured
      if (unit.meta.jumpDamage && unit.meta.jumpRadius) {
        context.queueEvent({
          kind: 'aoe',
          source: unit.id,
          target: unit.meta.jumpTarget || unit.pos,
          meta: {
            aspect: 'kinetic',
            radius: unit.meta.jumpRadius,
            amount: unit.meta.jumpDamage,
            force: 3
          }
        });
      }
      
      // Queue landing
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            ...unit.meta,
            jumping: false,
            jumpProgress: 0,
            z: 0,
            jumpTarget: null,
            jumpOrigin: null,
            jumpDamage: null,
            jumpRadius: null
          }
        }
      });
    } else {
      // Update jump progress
      const jumpTarget = unit.meta.jumpTarget;
      if (jumpTarget) {
        const t = newProgress / jumpDuration;
        const arcHeight = 2; // Peak height of jump arc
        const height = 4 * arcHeight * t * (1 - t); // Parabolic arc
        
        // Linear interpolation for x and y
        const newX = unit.pos.x + (jumpTarget.x - unit.pos.x) * (1 / jumpDuration);
        const newY = unit.pos.y + (jumpTarget.y - unit.pos.y) * (1 / jumpDuration);
        
        // Update position and progress
        context.queueCommand({
          type: 'move',
          params: {
            unitId: unit.id,
            x: newX,
            y: newY
          }
        });
        
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              ...unit.meta,
              jumpProgress: newProgress,
              jumpHeight: height,
              z: height // Also set z for compatibility with tests
            }
          }
        });
      }
    }
  }
}