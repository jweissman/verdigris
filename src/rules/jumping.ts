import { Rule } from './rule';
import { Unit } from '../types/Unit';
import { Abilities } from './abilities';

export class Jumping extends Rule {
  apply(): void {
    const units = this.sim.units;
    for (const unit of units) {
      if (unit.meta?.jumping) {
        this.updateJump(unit);
      }
    }
  }

  private updateJump(unit: Unit): void {
    const jumpDuration = Abilities.all.jumps.config?.duration || 10; // ticks
    const newProgress = (unit.meta.jumpProgress || 0) + 1;

    if (newProgress >= jumpDuration) {
      // Queue landing
      this.sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            jumping: false,
            jumpProgress: newProgress,
            z: 0
          }
        }
      });

      this.sim.queuedEvents.push({
        kind: 'aoe',
        source: unit.id,
        target: unit.pos,
        meta: {
          radius: unit.meta.jumpRadius || Abilities.all.jump?.config?.impact?.radius || 3,
          amount: unit.meta.jumpDamage || Abilities.all.jump?.config?.impact?.damage || 5,
          aspect: 'kinetic', // Physical impact damage
          friendlyFire: false // Explicitly no friendly fire
        }
      });
    } else {
      const progress = newProgress / jumpDuration;
      const maxHeight = Abilities.all.jump?.config?.height || 5;
      const z = (maxHeight * Math.sin(progress * Math.PI) || 0) * 2;
      
      // Queue jump progress update
      this.sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            jumpProgress: newProgress,
            z
          }
        }
      });

      let origin = unit.meta.jumpOrigin || { x: unit.pos.x, y: unit.pos.y };
      let target = unit.meta.jumpTarget || { x: unit.intendedMove.x, y: unit.intendedMove.y };

      // Queue move command to update position during jump
      const newX = Math.round(origin.x + (target.x - origin.x) * progress);
      const newY = Math.round(origin.y + (target.y - origin.y) * progress);
      
      this.sim.queuedCommands.push({
        type: 'move',
        params: {
          unitId: unit.id,
          dx: newX - unit.pos.x,
          dy: newY - unit.pos.y
        }
      });
    }
  }
}
