import { Rule } from "./rule";
import { UnitOperations } from "../UnitOperations";
import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15; // Slower, more deliberate movement
  apply = () => {
    // Always use bulk forces command for consistent behavior
    this.sim.queuedCommands.push({
      type: 'forces',
      params: {}
    });
    return;
    
    // REMOVED: Traditional individual command processing - keeping code below for reference but unreachable
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
        if (unit.meta.jumping) continue;
        
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
            if (this.rng.random() < 0.15) {
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
                    if (this.rng.random() < 0.5) dy = 0;
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
  
  private applyBulkMovement(): void {
    // Process all movement in a single pass without commands
    const units = this.sim.units as Unit[];
    
    // First mark dead units
    for (const unit of units) {
      if (unit.hp <= 0 && unit.state !== 'dead') {
        unit.state = 'dead';
      }
    }
    
    // Then apply all movements directly
    for (const unit of units) {
      if (unit.state === 'dead' || unit.meta.jumping) continue;
      
      const intendedMove = unit.intendedMove;
      if (!intendedMove || (intendedMove.x === 0 && intendedMove.y === 0)) continue;
      
      // Check if movement is valid
      const newX = unit.pos.x + intendedMove.x;
      const newY = unit.pos.y + intendedMove.y;
      
      // Boundary check
      if (newX < 0 || newX >= this.sim.fieldWidth || newY < 0 || newY >= this.sim.fieldHeight) {
        continue;
      }
      
      // For huge units, check all body positions
      if (unit.meta.huge) {
        if (!this.canHugeUnitMove(unit, intendedMove.x, intendedMove.y)) {
          continue;
        }
      }
      
      // Apply the movement directly
      unit.pos.x = newX;
      unit.pos.y = newY;
      
      // Mark as dirty for rendering
      this.sim.markDirty(unit.id);
    }
    
    // Resolve any collisions that occurred
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
    // Use SoA acceleration for any significant unit count
    if (sim.unitArrays && sim.units.length > 20) {
      return UnitMovement.resolveCollisionsSoA(sim);
    }
    
    // Fallback to traditional method for smaller unit counts
    UnitMovement.resolveCollisionsTraditional(sim);
  }
  
  // Vectorized collision resolution using SoA - OPTIMIZED with spatial grid
  private static resolveCollisionsSoA(sim: Simulator) {
    // Sync to SoA for vectorized processing
    const arrays = sim.unitArrays;
    
    // Build spatial grid for O(1) collision checks
    const spatialGrid = new Map<string, number>();
    for (let i = 0; i < arrays.activeCount; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      const key = `${Math.floor(arrays.posX[i])},${Math.floor(arrays.posY[i])}`;
      spatialGrid.set(key, i); // Only store one unit per cell for simplicity
    }
    
    // Use SoA collision detection (much faster)
    const collisions = arrays.detectCollisions(1.0);
    
    // Batch all displacements to apply at once
    const displacements = new Float32Array(arrays.capacity * 2);
    
    // Process each collision pair
    for (const [i, j] of collisions) {
      // Skip dead units
      if (arrays.state[i] === 3 || arrays.state[j] === 3) continue;
      
      // Determine which unit has priority (higher mass + hp)
      const priorityI = arrays.mass[i] * 10 + arrays.hp[i];
      const priorityJ = arrays.mass[j] * 10 + arrays.hp[j];
      
      const displacedIndex = priorityI > priorityJ ? j : i;
      
      // Skip if already displaced
      if (displacements[displacedIndex * 2] !== 0 || displacements[displacedIndex * 2 + 1] !== 0) continue;
      
      // Find displacement for lower priority unit
      const x = Math.floor(arrays.posX[displacedIndex]);
      const y = Math.floor(arrays.posY[displacedIndex]);
      
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, -1], [1, -1], [-1, 1]
      ];
      
      for (const [dx, dy] of dirs) {
        const newX = x + dx;
        const newY = y + dy;
        
        // Boundary check
        if (newX < 0 || newX >= sim.fieldWidth || newY < 0 || newY >= sim.fieldHeight) continue;
        
        // O(1) collision check using spatial grid
        const key = `${newX},${newY}`;
        if (!spatialGrid.has(key)) {
          // Found free space - record displacement
          displacements[displacedIndex * 2] = dx;
          displacements[displacedIndex * 2 + 1] = dy;
          spatialGrid.set(key, displacedIndex); // Reserve this spot
          break;
        }
      }
    }
    
    // Apply all displacements in a single vectorized batch
    const moveCommand = sim.rulebook.find(r => r.constructor.name === 'CommandHandler')?.commands?.get('move');
    if (moveCommand) {
      for (let i = 0; i < arrays.activeCount; i++) {
        const dx = displacements[i * 2];
        const dy = displacements[i * 2 + 1];
        if (dx !== 0 || dy !== 0) {
          // Direct execution to avoid command queue overhead
          arrays.posX[i] += dx;
          arrays.posY[i] += dy;
          // No need to update unit position - proxy will read from arrays
        }
      }
    }
  }
  
  // Traditional collision resolution - OPTIMIZED
  private static resolveCollisionsTraditional(sim: Simulator) {
    // Build spatial hash for O(1) lookups
    const spatialHash = new Map<string, Unit>();
    const collisions: Unit[][] = [];
    
    // Single pass to detect collisions
    for (const unit of sim.units) {
      if (unit.state === 'dead') continue;
      const key = `${Math.floor(unit.pos.x)},${Math.floor(unit.pos.y)}`;
      
      const existing = spatialHash.get(key);
      if (existing) {
        // Collision detected - add to list
        let found = false;
        for (const group of collisions) {
          if (group.includes(existing)) {
            group.push(unit);
            found = true;
            break;
          }
        }
        if (!found) {
          collisions.push([existing, unit]);
        }
      } else {
        spatialHash.set(key, unit);
      }
    }
    
    // Batch all move commands
    const moves: Array<{unitId: string, dx: number, dy: number}> = [];
    
    // Process collision groups
    for (const group of collisions) {
      // Sort by priority once
      group.sort((a, b) => {
        const priorityA = (a.mass || 1) * 10 + a.hp;
        const priorityB = (b.mass || 1) * 10 + b.hp;
        return priorityB - priorityA;
      });
      
      // Displace all but the highest priority
      for (let i = 1; i < group.length; i++) {
        const unit = group[i];
        const x = Math.floor(unit.pos.x);
        const y = Math.floor(unit.pos.y);
        
        // Try each direction
        const dirs = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,-1], [1,-1], [-1,1]];
        for (const [dx, dy] of dirs) {
          const newX = x + dx;
          const newY = y + dy;
          
          // Boundary check
          if (newX < 0 || newX >= sim.fieldWidth || newY < 0 || newY >= sim.fieldHeight) continue;
          
          // O(1) check if free
          const key = `${newX},${newY}`;
          if (!spatialHash.has(key)) {
            moves.push({ unitId: unit.id, dx, dy });
            spatialHash.set(key, unit); // Reserve spot
            break;
          }
        }
      }
    }
    
    // Queue all moves at once
    for (const move of moves) {
      sim.queuedCommands.push({
        type: 'move',
        params: move
      });
    }
  }
}
