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
        // Skip movement for jumping units - they're following a ballistic trajectory
        if (unit.meta?.jumping) continue;
        
        // Calculate intended movement based on AI behaviors
        let intendedMove = unit.intendedMove || { x: 0, y: 0 };
        
        // AI behaviors based on tags
        if (unit.tags) {
          // Hunt behavior - use cached target data
          if (unit.tags.includes('hunt')) {
            const targetData = this.sim.targetCache?.getTargetData(unit.id);
            const targetId = targetData?.closestEnemy;
            
            if (targetId) {
              const target = this.sim.creatureById(targetId);
              if (target) {
                const dxRaw = target.pos.x - unit.pos.x;
                const dyRaw = target.pos.y - unit.pos.y;
                let dx = 0, dy = 0;
                if (Math.abs(dxRaw) > Math.abs(dyRaw)) {
                  dx = dxRaw > 0 ? 1 : -1;
                } else if (Math.abs(dyRaw) > 0) {
                  dy = dyRaw > 0 ? 1 : -1;
                } else if (Math.abs(dxRaw) > 0) {
                  dx = dxRaw > 0 ? 1 : -1;
                }
                intendedMove = { x: dx, y: dy };
              }
            }
          }
          // Swarm behavior - use cached ally data
          else if (unit.tags.includes('swarm')) {
            if (Simulator.rng.random() < 0.15) {
              // Sometimes don't move (15% chance)
              intendedMove = { x: 0, y: 0 };
            } else {
              const targetData = this.sim.targetCache?.getTargetData(unit.id);
              const nearbyAllies = targetData?.nearbyAllies || [];
              const closestAllyId = targetData?.closestAlly;
              
              // Use nearby allies if available, otherwise use closest ally
              const alliesToConsider = nearbyAllies.length > 0 ? nearbyAllies : 
                                       closestAllyId ? [closestAllyId] : [];
              
              if (alliesToConsider.length > 0) {
                // Calculate center of mass of allies
                let avgX = 0, avgY = 0;
                let count = 0;
                for (const allyId of alliesToConsider) {
                  const ally = this.sim.creatureById(allyId);
                  if (ally && ally.state !== 'dead') {
                    avgX += ally.pos.x;
                    avgY += ally.pos.y;
                    count++;
                  }
                }
                
                if (count > 0) {
                  avgX /= count;
                  avgY /= count;
                  
                  // Move towards center of mass
                  let dx = 0, dy = 0;
                  if (Math.abs(avgX - unit.pos.x) >= 1) dx = avgX > unit.pos.x ? 1 : -1;
                  if (Math.abs(avgY - unit.pos.y) >= 1) dy = avgY > unit.pos.y ? 1 : -1;
                  
                  // Pick one direction for grid movement
                  if (dx !== 0 && dy !== 0) {
                    if (Math.random() < 0.5) dy = 0;
                    else dx = 0;
                  }
                  
                  if (dx !== 0 || dy !== 0) {
                    intendedMove = { x: dx, y: dy };
                  } else {
                    const wanderedUnit = UnitOperations.wander(unit);
                    intendedMove = wanderedUnit.intendedMove;
                  }
                } else {
                  const wanderedUnit = UnitOperations.wander(unit);
                  intendedMove = wanderedUnit.intendedMove;
                }
              } else {
                // No allies at all, just wander
                const wanderedUnit = UnitOperations.wander(unit);
                intendedMove = wanderedUnit.intendedMove;
              }
            }
          }
          // Default wanderer behavior
          else if (unit.tags.includes('wander')) {
            const wanderedUnit = UnitOperations.wander(unit);
            intendedMove = wanderedUnit.intendedMove;
          }
          // Follower behavior - use cached ally data
          else if (unit.tags.includes('follower')) {
            const targetData = this.sim.targetCache?.getTargetData(unit.id);
            const closestAllyId = targetData?.closestAlly;
            
            if (closestAllyId) {
              const closest = this.sim.creatureById(closestAllyId);
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
