import { Rule } from './rule';
import { Unit } from '../types/Unit';
import type { TickContext } from '../core/tick_context';

export class Tossing extends Rule {
  execute(context: TickContext): void {
    // Process tossing for each unit
    const units = context.getAllUnits();
    for (const unit of units) {
      if (unit.meta.tossing) {
        this.processToss(context, unit as Unit);
      }
    }
  }

  private processToss(context: TickContext, unit: Unit): void {
    const tossDuration = 8; // Fixed duration for toss (faster than jump)
    const tossProgress = (unit.meta.tossProgress || 0) + 1;

    if (tossProgress >= tossDuration) {
      // Toss completed - queue command to land at target
      // Complete toss: move to target and clear toss state
      context.queueCommand({
        type: 'move',
        params: {
          unitId: unit.id,
          x: unit.meta.tossTarget?.x || unit.pos.x,
          y: unit.meta.tossTarget?.y || unit.pos.y,
          z: 0
        }
      });
      
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            tossing: false,
            tossProgress: undefined,
            tossOrigin: undefined,
            tossTarget: undefined,
            tossForce: undefined
          }
        }
      });

      // Optional: Apply small AoE damage on landing (like jump)
      if (unit.meta.tossForce && unit.meta.tossForce > 3) {
        context.queueEvent({
          kind: 'aoe',
          source: unit.id,
          target: unit.pos,
          meta: {
            radius: 1,
            amount: Math.floor(unit.meta.tossForce / 2),
          }
        });
      }
    } else {
      // Queue command to update toss progress
      const progress = tossProgress / tossDuration;
      const origin = unit.meta.tossOrigin || { x: unit.pos.x, y: unit.pos.y };
      const target = unit.meta.tossTarget || { x: unit.pos.x, y: unit.pos.y };
      
      // Calculate interpolated position
      const newX = origin.x + (target.x - origin.x) * progress;
      const newY = origin.y + (target.y - origin.y) * progress;
      
      // Arc height (involuntary so maybe lower than jump)
      const maxHeight = 3; // Lower arc than jump
      const newZ = (maxHeight * Math.sin(progress * Math.PI)) * 2;
      
      // Update toss position and progress
      context.queueCommand({
        type: 'move',
        params: {
          unitId: unit.id,
          x: newX,
          y: newY,
          z: newZ
        }
      });
      
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: { tossProgress: tossProgress }
        }
      });
    }
  }
}