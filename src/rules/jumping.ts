import { Rule } from './rule';
import { Unit } from '../sim/types';

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
    // console.log(`Updating jump for unit ${unit.id}`);
    const jumpDuration = 10; // ticks
    unit.meta.jumpProgress = unit.meta.jumpProgress || 0;
    unit.meta.jumpProgress += 1;
    unit.meta.z = unit.meta.z || 0;

    if (unit.meta.jumpProgress >= jumpDuration) {
      unit.meta.jumping = false;
      unit.meta.z = 0;
    } else {
      const progress = unit.meta.jumpProgress / jumpDuration;
      const maxHeight = unit.abilities.jumps?.config?.height || 5; // Default height if not specified
      unit.meta.z = (maxHeight * Math.sin(progress * Math.PI) || 0) * 2; // Adjust height based on progress

      // we _do_ need some way to track the unit's planar movement during the jump
      let origin = unit.meta.jumpOrigin || { x: unit.pos.x, y: unit.pos.y };
      let target = unit.meta.jumpTarget || { x: unit.intendedMove.x, y: unit.intendedMove.y };

      unit.pos.x = origin.x + (target.x - origin.x) * progress;
      unit.pos.y = origin.y + (target.y - origin.y) * progress;
    }
  }
}
