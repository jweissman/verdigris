import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";
import { Unit } from "../sim/types";
import { Simulator } from "../core/simulator";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.hp <= 0) {
        return { ...unit, state: 'dead' };
      }


      if (unit.state !== 'dead') {
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

          else if (unit.tags.includes('follower')) {
            // Follow the nearest friendly unit
            const friends = this.sim.getRealUnits().filter(u => u.team === unit.team && u.state !== 'dead');
            if (friends.length > 0) {
              let closest = friends[0];
              let closestDist = Math.hypot(closest.pos.x - unit.pos.x, closest.pos.y - unit.pos.y);
              for (const friend of friends) {
                const dist = Math.hypot(friend.pos.x - unit.pos.x, friend.pos.y - unit.pos.y);
                if (dist < closestDist) {
                  closest = friend;
                  closestDist = dist;
                }
              }
              // Move towards the closest friendly unit
              const dx = closest.pos.x - unit.pos.x;
              const dy = closest.pos.y - unit.pos.y;
              const mag = Math.sqrt(dx * dx + dy * dy) || 1;
              unit.intendedMove = { x: (dx / mag), y: (dy / mag) };
            } else {
              // No friends, just wander
              unit = UnitOperations.wander(unit);
            }
          }
        }
      }

      // For huge units, validate the entire movement before applying
      if (unit.meta.huge && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0)) {
        if (this.canHugeUnitMove(unit, unit.intendedMove.x, unit.intendedMove.y)) {
          unit = UnitOperations.move(unit, 1, this.sim);
        } else {
          // Can't move, clear intended move
          unit.intendedMove = { x: 0, y: 0 };
        }
      } else {
        unit = UnitOperations.move(unit, 1, this.sim);
      }
      return unit;
    });

    UnitMovement.resolveCollisions(this.sim);
  }

  private canHugeUnitMove(unit: Unit, dx: number, dy: number): boolean {
    // Check if all body cells of a huge unit can move to their new positions
    const bodyPositions = this.getHugeUnitBodyPositions(unit);
    
    for (const pos of bodyPositions) {
      const newX = pos.x + dx;
      const newY = pos.y + dy;
      
      // Check boundaries
      if (newX < 0 || newX >= this.sim.fieldWidth || newY < 0 || newY >= this.sim.fieldHeight) {
        return false;
      }
      
      // Check if new position would be blocked (excluding our own body cells)
      if (this.sim.isApparentlyOccupied(newX, newY, unit)) {
        return false;
      }
    }
    
    return true;
  }

  private getHugeUnitBodyPositions(unit: Unit) {
    // Return all positions occupied by a huge unit (head + body)
    if (!unit.meta.huge) return [unit.pos];
    
    return [
      unit.pos, // Head
      { x: unit.pos.x, y: unit.pos.y + 1 }, // Body segment 1
      { x: unit.pos.x, y: unit.pos.y + 2 }, // Body segment 2
      { x: unit.pos.x, y: unit.pos.y + 3 }  // Body segment 3
    ];
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
