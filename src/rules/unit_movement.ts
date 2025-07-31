import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.hp <= 0) {
        return { ...unit, state: 'dead' };
      }
      if (unit.state !== 'dead') {
        // AI behaviors based on tags
        if (unit.tags && unit.state === 'idle') {
          if (UnitMovement.wanderRate > 0 && Math.random() < UnitMovement.wanderRate) {
            // Hunt behavior (farmers actively seek enemies)
            if (unit.tags.includes('hunt')) {
              unit = UnitOperations.hunt(unit, this.sim);
            }
            // Swarm behavior (worms group together)
            else if (unit.tags.includes('swarm')) {
              unit = UnitOperations.swarm(unit, this.sim);
            }
            // Default wanderer behavior
            else if (unit.tags.includes('wanderer')) {
              unit = UnitOperations.wander(unit);
            }
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
