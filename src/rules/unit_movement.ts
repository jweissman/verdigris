import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";
import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    // TODO: Convert to commands
    // For now, just process movement intents
    for (let unit of this.sim.units) {
      if (unit.hp <= 0) {
        // Queue command to mark as dead
        this.sim.queuedCommands.push({
          type: 'markDead',
          params: { unitId: unit.id }
        });
        continue;
      }


      if (unit.state !== 'dead') {
        // Calculate intended movement based on AI behaviors
        let intendedMove = unit.intendedMove || { x: 0, y: 0 };
        
        // AI behaviors based on tags
        if (unit.tags) {
          // Hunt behavior
          if (unit.tags.includes('hunt')) {
            const huntedUnit = UnitOperations.hunt(unit, this.sim);
            intendedMove = huntedUnit.intendedMove;
          }
          // Swarm behavior (worms group together)
          else if (unit.tags.includes('swarm')) {
            const swarmedUnit = UnitOperations.swarm(unit, this.sim);
            intendedMove = swarmedUnit.intendedMove;
          }
          // Default wanderer behavior
          else if (unit.tags.includes('wander')) {
            const wanderedUnit = UnitOperations.wander(unit);
            intendedMove = wanderedUnit.intendedMove;
          }
          // Follower behavior
          else if (unit.tags.includes('follower')) {
            // Follow the nearest friendly unit - optimized to avoid getRealUnits
            let closest: Unit | null = null;
            let closestDist = Infinity;
            
            for (const u of this.sim.units) {
              if (u.team !== unit.team || u.state === 'dead' || u.id === unit.id) continue;
              if (u.meta?.phantom) continue; // Skip phantom units
              
              const dist = Math.hypot(u.pos.x - unit.pos.x, u.pos.y - unit.pos.y);
              if (dist < closestDist) {
                closest = u;
                closestDist = dist;
              }
            }
            
            if (closest) {
              // Move towards the closest friendly unit
              const dx = closest.pos.x - unit.pos.x;
              const dy = closest.pos.y - unit.pos.y;
              const mag = Math.sqrt(dx * dx + dy * dy) || 1;
              intendedMove = { x: (dx / mag), y: (dy / mag) };
            } else {
              // No friends, just wander
              const wanderedUnit = UnitOperations.wander(unit);
              intendedMove = wanderedUnit.intendedMove;
            }
          }
        }
        
        // Queue move command if unit has intended movement
        if (intendedMove && (intendedMove.x !== 0 || intendedMove.y !== 0)) {
          // For huge units, validate the movement first
          if (unit.meta.huge) {
            if (this.canHugeUnitMove(unit, intendedMove.x, intendedMove.y)) {
              this.sim.queuedCommands.push({
                type: 'move',
                params: {
                  unitId: unit.id,
                  dx: intendedMove.x,
                  dy: intendedMove.y
                }
              });
            }
          } else {
            // Regular unit movement
            this.sim.queuedCommands.push({
              type: 'move',
              params: {
                unitId: unit.id,
                dx: intendedMove.x,
                dy: intendedMove.y
              }
            });
          }
        }
      }
    }

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
    // if any units are now on the same square, we want to push the lighter one out
    const positions: { [key: string]: Unit[] } = {};
    for (const unit of sim.units) {
      const posKey = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
      if (!positions[posKey]) positions[posKey] = [];
      positions[posKey].push(unit);
    }
    for (const posKey in positions) {
      const unitsAtPos = positions[posKey];
      if (unitsAtPos.length > 1) {
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
        // Queue moves to push lighter units out of the way
        for (let i = 1; i < unitsAtPos.length; i++) {
          const unit = unitsAtPos[i];
          let halt = false;
          for (let dx = -1; dx <= 1; dx++) {
            if (halt) break;
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue; // Skip no movement
              if (sim.validMove(unit, dx, dy)) {
                // Queue a move command instead of direct mutation
                sim.queuedCommands.push({
                  type: 'move',
                  params: {
                    unitId: unit.id,
                    dx: dx,
                    dy: dy
                  }
                });
                halt = true; // Stop trying to move this unit
                break;
              }
            }
          }
        }
      }
    }
  }
}
