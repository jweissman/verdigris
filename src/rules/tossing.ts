import { Rule } from './rule';
import { Unit } from '../sim/types';

export class Tossing extends Rule {
  apply(): void {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.meta?.tossing) {
        this.updateToss(unit);
      }

      return unit;
    });
  }

  private updateToss(unit: Unit): void {
    const tossDuration = 8; // Fixed duration for toss (faster than jump)
    unit.meta.tossProgress = (unit.meta.tossProgress || 0) + 1;

    if (unit.meta.tossProgress >= tossDuration) {
      // Toss completed - land at target
      console.log(`🤾 Toss completed for ${unit.id}. Landing at target.`);
      unit.meta.tossing = false;
      unit.meta.z = 0;
      
      // Set final position to target
      if (unit.meta.tossTarget) {
        unit.pos.x = unit.meta.tossTarget.x;
        unit.pos.y = unit.meta.tossTarget.y;
      }

      // Optional: Apply small AoE damage on landing (like jump)
      if (unit.meta.tossForce && unit.meta.tossForce > 3) {
        console.log(`🤾 Tossed unit ${unit.id} landing with force - applying minor AoE`);
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
      // Calculate arc physics during toss
      const progress = unit.meta.tossProgress / tossDuration;
      const origin = unit.meta.tossOrigin || { x: unit.pos.x, y: unit.pos.y };
      const target = unit.meta.tossTarget || { x: unit.pos.x, y: unit.pos.y };
      
      // Interpolate position
      unit.pos.x = origin.x + (target.x - origin.x) * progress;
      unit.pos.y = origin.y + (target.y - origin.y) * progress;
      
      // Arc height (involuntary so maybe lower than jump)
      const maxHeight = 3; // Lower arc than jump
      unit.meta.z = (maxHeight * Math.sin(progress * Math.PI)) * 2;
    }
  }
}