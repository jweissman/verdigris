import { Rule } from './rule';
import { Unit } from '../types/Unit';
import { Abilities } from './abilities';

export class Jumping extends Rule {
  apply(): void {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.meta?.jumping) {
        this.updateJump(unit);
      }

      return unit;
    });
  }

  private updateJump(unit: Unit): void {
    const jumpDuration = Abilities.all.jumps.config?.duration || 10; // ticks
    unit.meta.jumpProgress = (unit.meta.jumpProgress || 0) + 1;

    if (unit.meta.jumpProgress >= jumpDuration) {
      unit.meta.jumping = false;
      unit.meta.z = 0;

      this.sim.queuedEvents.push({
        kind: 'aoe',
        source: unit.id,
        target: unit.pos,
        meta: {
          radius: Abilities.all.jump.config?.impact.radius || 3,
          amount: Abilities.all.jump.config?.impact.damage || 5,
        }
      });
    } else {
      const progress = unit.meta.jumpProgress / jumpDuration;
      const maxHeight = Abilities.all.jump?.config?.height || 5;
      unit.meta.z = (maxHeight * Math.sin(progress * Math.PI) || 0) * 2;

      let origin = unit.meta.jumpOrigin || { x: unit.pos.x, y: unit.pos.y };
      let target = unit.meta.jumpTarget || { x: unit.intendedMove.x, y: unit.intendedMove.y };

      unit.pos.x = origin.x + (target.x - origin.x) * progress;
      unit.pos.y = origin.y + (target.y - origin.y) * progress;
    }
  }
}
