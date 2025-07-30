import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.34444; // Default wander rate
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.hp <= 0) {
        return { ...unit, state: 'dead' };
      }
      if (unit.state !== 'dead') {
        // Only units tagged as wanderer and in idle state wander
        if (unit.tags && unit.tags.includes('wanderer') && unit.state === 'idle') {
          if (UnitMovement.wanderRate > 0 && Math.random() < UnitMovement.wanderRate) {
            unit = UnitOperations.wander(unit);
          }
        }
        // Only move if velocity is nonzero
        if (unit.vel.x !== 0 || unit.vel.y !== 0) {
          unit = UnitOperations.move(unit, 1, this.sim);
        }
      }
      return unit;
    });
  }
}
