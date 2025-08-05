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
    // console.log(`[Jumping] Updating jump for ${unit.id} at tick ${this.sim.ticks}. Progress: ${unit.meta.jumpProgress}`);
    const jumpDuration = unit.abilities?.jumps?.config?.duration || 10; // ticks
    unit.meta.jumpProgress = (unit.meta.jumpProgress || 0) + 1;

    // console.log(`[Jumping] Jump progress for ${unit.id}: ${unit.meta.jumpProgress}/${jumpDuration}`);

    if (unit.meta.jumpProgress >= jumpDuration) {
      // console.log(`[Jumping] Jump completed for ${unit.id}. Resetting jump state.`);
      unit.meta.jumping = false;
      unit.meta.z = 0;

      // Apply AoE damage on landing
      // console.log(`[Jumping] Applying AoE damage for ${unit.id} on landing.`);
      // if (unit.abilities.jump?.config?.impact) {
        // console.log(`[Jumping] Queuing AoE event for ${unit.id}`);
        this.sim.queuedEvents.push({
          kind: 'aoe',
          source: unit.id,
          target: unit.pos,
          meta: {
            radius: unit.abilities.jump?.config?.impact.radius || 3,
            amount: unit.abilities.jump?.config?.impact.damage || 5,
          }
        });
        // this.sim.areaDamage({
        //   pos: unit.pos,
        //   radius: unit.abilities.jump.config.impact.radius,
        //   damage: unit.abilities.jump.config.impact.damage,
        //   team: unit.team,
        // });
      // }
    } else {
      const progress = unit.meta.jumpProgress / jumpDuration;
      const maxHeight = unit.abilities.jump?.config?.height || 5; // Default height if not specified
      unit.meta.z = (maxHeight * Math.sin(progress * Math.PI) || 0) * 2; // Adjust height based on progress

      // we _do_ need some way to track the unit's planar movement during the jump
      let origin = unit.meta.jumpOrigin || { x: unit.pos.x, y: unit.pos.y };
      let target = unit.meta.jumpTarget || { x: unit.intendedMove.x, y: unit.intendedMove.y };

      unit.pos.x = origin.x + (target.x - origin.x) * progress;
      unit.pos.y = origin.y + (target.y - origin.y) * progress;
    }
  }
}
