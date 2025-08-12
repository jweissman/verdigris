import { Rule } from './rule';
import { Unit } from '../types/Unit';

export class Tossing extends Rule {
  apply(): void {
    // Process tossing for each unit
    const units = this.sim.units;
    for (const unit of units) {
      if (unit.meta?.tossing) {
        this.processToss(unit as Unit);
      }
    }
  }

  private processToss(unit: Unit): void {
    const tossDuration = 8; // Fixed duration for toss (faster than jump)
    const tossProgress = (unit.meta.tossProgress || 0) + 1;

    if (tossProgress >= tossDuration) {
      // Toss completed - queue command to land at target
      this.sim.queuedCommands.push({
        type: 'updateToss',
        params: {
          unitId: unit.id,
          complete: true,
          targetX: unit.meta.tossTarget?.x || unit.pos.x,
          targetY: unit.meta.tossTarget?.y || unit.pos.y
        }
      });

      // Optional: Apply small AoE damage on landing (like jump)
      if (unit.meta.tossForce && unit.meta.tossForce > 3) {
        this.sim.queuedEvents.push({
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
      
      this.sim.queuedCommands.push({
        type: 'updateToss',
        params: {
          unitId: unit.id,
          complete: false,
          progress: tossProgress,
          x: newX,
          y: newY,
          z: newZ
        }
      });
    }
  }
}