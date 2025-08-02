import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";
import { Unit } from "../sim/types";
import { Simulator } from "../simulator";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.hp <= 0) {
        return { ...unit, state: 'dead' };
      }

      if (unit.state === 'attack') {
        // check if the target is still valid
        if (unit.intendedTarget) {
          const target = this.sim.creatureById(unit.intendedTarget);
          if (!target || target.state === 'dead') {
            unit.intendedTarget = undefined;
            unit.state = 'idle';
            unit.intendedMove = { x: 0, y: 0 };
          } else {
            // if within melee range, continue attacking
            const dx = target.pos.x - unit.pos.x;
            const dy = target.pos.y - unit.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1.1) {
              unit.intendedMove = { x: 0, y: 0 }; // Stop moving
            } else {
              // we need to close?
              unit.state = 'idle';
            }
          }
        }
      }

      if (unit.state !== 'dead' && unit.state !== 'attack') {
        // AI behaviors based on tags
        if (unit.tags) {
          // Hunt behavior
          if (unit.tags.includes('hunt')) {
            unit = UnitOperations.hunt(unit, this.sim);
          }
          // Swarm behavior (worms group together)
          else if (unit.tags.includes('swarm')) {
            unit = UnitOperations.swarm(unit, this.sim);
          }
          // Default wanderer behavior
          else if (unit.tags.includes('wander')) {
            unit = UnitOperations.wander(unit);
          }
        }
      }

      unit = UnitOperations.move(unit, 1, this.sim);
      return unit;
    });

    UnitMovement.resolveCollisions(this.sim);
  }
  static resolveCollisions(sim: Simulator) {
    // console.log(`[UnitMovement] Resolving collisions...`);
    // if any units are now on the same square, we want to push the lighter one out
    const positions: { [key: string]: Unit[] } = {};
    for (const unit of sim.units) {
      const posKey = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
      if (!positions[posKey]) positions[posKey] = [];
      positions[posKey].push(unit);
    }
    // console.log(`[UnitMovement] Found ${Object.keys(positions).length} unique positions with units.`);
    for (const posKey in positions) {
      const unitsAtPos = positions[posKey];
      if (unitsAtPos.length > 1) {
        // console.log(`[UnitMovement] Multiple units at ${posKey}: ${unitsAtPos.map(u => u.id).join(', ')}`);
        // Sort by mass, then by hp
        unitsAtPos.sort((a, b) => {
          if (a.mass !== b.mass) {
            return a.mass - b.mass ? 1 : -1;
          }
          if (a.hp !== b.hp) {
            return a.hp - b.hp ? 1 : -1;
          }
          if (a.id !== b.id) {
            return String(a.id).localeCompare(String(b.id));
          }
          return 0;
        });
        // Move the lighter units out of the way
        for (let i = 1; i < unitsAtPos.length; i++) {
          const unit = unitsAtPos[i];
          let halt = false;
          for (let dx = -1; dx <= 1; dx++) {
            if (halt) break;
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue; // Skip no movement
              // console.log(`[UnitMovement] Attempting to move unit ${unit.id} by (${dx}, ${dy})`);
              if (sim.validMove(unit, dx, dy)) {
                unit.pos.x += dx;
                unit.pos.y += dy;

                // console.log(`[UnitMovement] Successfully moved unit ${unit.id} to (${unit.pos.x}, ${unit.pos.y})`);
                halt = true; // Stop trying to move this unit
                break;
              }
            }
          }
          // console.log(`[UnitMovement] Final position of unit ${unit.id} is (${unit.pos.x}, ${unit.pos.y})`);
        }
      }
    }
  }
}
