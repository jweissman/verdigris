import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";
import { Unit } from "../sim/types";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.hp <= 0) {
        return { ...unit, state: 'dead' };
      }
      if (unit.state !== 'dead') {
        if (unit.posture === 'fight') {
          // If in fight posture, move towards intended target
          const target = this.sim.creatureById(unit.intendedTarget);
          if (target) {
            unit.intendedMove = {
              x: target.pos.x > unit.pos.x ? 1 : -1,
              y: target.pos.y > unit.pos.y ? 1 : -1
            };
          } else {
            // If target is gone, reset intended move
            unit.intendedMove = { x: 0, y: 0 };
            unit.posture = 'alert';
            unit.state = 'idle'; // Reset state
            unit.intendedTarget = undefined;
          }
        }


        // AI behaviors based on tags
        if (unit.tags) { //} && unit.state === 'idle') {
          // if (UnitMovement.wanderRate > 0 && Math.random() < UnitMovement.wanderRate) {
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
          // }
        }
        // Only move if velocity is nonzero
        // if (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0) {
        // }
        // let unit =
        unit = UnitOperations.move(unit, 1, this.sim);
      }
      return unit;
    });

    // if any units are now on the same square, we want to push the lighter one out
    const positions: { [key: string]: Unit[] } = {};
    for (const unit of this.sim.units) {
      const posKey = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
      if (!positions[posKey]) positions[posKey] = [];
      positions[posKey].push(unit);
    }
    for (const posKey in positions) {
      const unitsAtPos = positions[posKey];
      if (unitsAtPos.length > 1) {
        console.log(`[UnitMovement] Multiple units at ${posKey}: ${unitsAtPos.map(u => u.id).join(', ')}`);
        // Sort by mass, then by hp
        unitsAtPos.sort((a, b) => {
          if (a.mass !== b.mass) {
            return a.mass - b.mass ? 1 : -1;
          }
          return a.hp - b.hp ? 1 : -1;
        });
        // Move the lighter units out of the way
        for (let i = 1; i < unitsAtPos.length; i++) {
          const unit = unitsAtPos[i];
          console.log(`[UnitMovement] Pushing unit ${unit.id} out of the way at ${posKey}`);
          // Try to move the unit out of the way
          // const dx = Math.random() < 0.5 ? 1 : -1;
          // const dy = Math.random() < 0.5 ? 1 : -1;
          let halt = false;
          for (let dx = -1; dx <= 1; dx++) {
            if (halt) break;
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue; // Skip no movement
              console.log(`[UnitMovement] Attempting to move unit ${unit.id} by (${dx}, ${dy})`);
              if (this.sim.tryMove(unit, dx, dy)) {
                console.log(`[UnitMovement] Successfully moved unit ${unit.id} to (${unit.pos.x}, ${unit.pos.y})`);
                // break; // Stop trying to move this unit
                halt = true; // Stop trying to move this unit
                break;
              }
            }
          }
          console.log(`[UnitMovement] Final position of unit ${unit.id} is (${unit.pos.x}, ${unit.pos.y})`);
        }
      }
    }
  }
}
