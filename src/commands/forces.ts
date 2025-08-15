import { Command } from "../rules/command";

/**
 * Higher-order 'forces' command - bulk kinematics and physics processing
 * Replaces individual move commands with vectorized physics updates
 */
export class ForcesCommand extends Command {
  private transform: any;
  
  constructor(sim: any, transform: any) {
    super(sim);
    this.transform = transform;
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    // This command operates on all units at once
    this.applyAllForces();
  }
  
  private applyAllForces(): void {
    // Projectiles are now handled by Physics rule, not here
    
    // Try vectorized path first for performance
    const arrays = this.sim.getUnitArrays();
    if (!arrays) {
      this.applyAllForcesLegacy();
      return;
    }
    
    // Vectorized movement on typed arrays - this is where the speed comes from!
    const capacity = arrays.capacity;
    const fieldWidth = this.sim.fieldWidth;
    const fieldHeight = this.sim.fieldHeight;
    
    // Build occupancy grid before movement
    const occupiedGrid = new Set<number>();
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3 || arrays.hp[i] <= 0) continue;
      const packedPos = Math.floor(arrays.posY[i]) * fieldWidth + Math.floor(arrays.posX[i]);
      occupiedGrid.add(packedPos);
    }
    
    // Process all units in tight loops over typed arrays
    for (let i = 0; i < capacity; i++) {
      // Skip inactive or dead units (branch-free would be even faster)
      if (arrays.active[i] === 0 || arrays.state[i] === 3 || arrays.hp[i] <= 0) continue;
      
      // Skip units with special states (stored in metadata)
      const unitId = arrays.unitIds[i];
      const meta = this.sim.getUnitColdData().get(unitId);
      if (meta?.meta?.jumping || meta?.meta?.phantom) continue;
      
      // Apply intended movement directly to position arrays
      const dx = arrays.intendedMoveX[i];
      const dy = arrays.intendedMoveY[i];
      
      if (dx === 0 && dy === 0) continue;
      
      // Calculate new position with bounds checking
      const newX = arrays.posX[i] + dx;
      const newY = arrays.posY[i] + dy;
      
      // Check bounds
      if (newX < 0 || newX >= fieldWidth || newY < 0 || newY >= fieldHeight) continue;
      
      // Check if destination is occupied
      const oldPackedPos = Math.floor(arrays.posY[i]) * fieldWidth + Math.floor(arrays.posX[i]);
      const newPackedPos = Math.floor(newY) * fieldWidth + Math.floor(newX);
      
      if (newPackedPos !== oldPackedPos && occupiedGrid.has(newPackedPos)) {
        // Destination occupied, don't move
        continue;
      }
      
      // Apply movement
      occupiedGrid.delete(oldPackedPos);
      arrays.posX[i] = newX;
      arrays.posY[i] = newY;
      occupiedGrid.add(newPackedPos);
    }
    
    // Resolve collisions using SoA collision detection
    this.resolveCollisionsSoA(arrays);
  }
  
  private updateProjectiles(): void {
    if (!this.sim.projectiles) return;
    
    const toRemove: number[] = [];
    
    // Update all projectile positions in a single pass
    for (let i = 0; i < this.sim.projectiles.length; i++) {
      const p = this.sim.projectiles[i];
      
      // Update position
      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;
      
      // Apply gravity for bombs
      if (p.type === 'bomb') {
        p.vel.y += 0.2;
        p.lifetime = (p.lifetime || 0) + 1;
      }
      
      // Mark for removal if out of bounds
      if (p.pos.x < 0 || p.pos.x >= this.sim.fieldWidth ||
          p.pos.y < 0 || p.pos.y >= this.sim.fieldHeight) {
        toRemove.push(i);
      }
    }
    
    // Remove out-of-bounds projectiles
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.sim.projectiles.splice(toRemove[i], 1);
    }
  }
  
  private applyAllForcesLegacy(): void {
    // Batch all movement operations through Transform
    // This maintains the buffering while processing all units at once
    
    // Build a map of all movement updates
    const moveUpdates = new Map<string, { pos: { x: number, y: number } }>();
    const units = this.sim.units;
    
    // First pass: calculate all new positions
    for (const unit of units) {
      if (unit.state === 'dead' || unit.hp <= 0) continue;
      if (unit.meta.jumping) continue; // Skip jumping units
      if (unit.meta.phantom) continue; // Skip phantom units - they follow parent
      
      const intendedMove = unit.intendedMove;
      if (!intendedMove || (intendedMove.x === 0 && intendedMove.y === 0)) continue;
      
      // Calculate new position
      const newX = unit.pos.x + intendedMove.x;
      const newY = unit.pos.y + intendedMove.y;
      
      // Clamp to field bounds
      const clampedX = Math.max(0, Math.min(this.sim.fieldWidth - 1, newX));
      const clampedY = Math.max(0, Math.min(this.sim.fieldHeight - 1, newY));
      
      moveUpdates.set(unit.id, { pos: { x: clampedX, y: clampedY } });
    }
    
    // Second pass: resolve collisions by checking occupancy
    const occupancy = new Map<string, string>(); // position -> unitId
    
    // First claim positions for units that aren't moving
    for (const unit of units) {
      if (!moveUpdates.has(unit.id) && unit.state !== 'dead') {
        const key = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
        occupancy.set(key, unit.id);
      }
    }
    
    // Then try to claim new positions for moving units
    for (const [unitId, update] of moveUpdates) {
      const key = `${Math.round(update.pos.x)},${Math.round(update.pos.y)}`;
      const unit = units.find(u => u.id === unitId);
      
      if (!occupancy.has(key)) {
        // Position is free, claim it
        occupancy.set(key, unitId);
      } else {
        // Collision! Check if we can push through based on mass
        const occupyingId = occupancy.get(key);
        const occupyingUnit = units.find(u => u.id === occupyingId);
        
        if (unit && occupyingUnit) {
          const myPriority = (unit.mass || 1) * 10 + (unit.hp || 0);
          const theirPriority = (occupyingUnit.mass || 1) * 10 + (occupyingUnit.hp || 0);
          
          if (myPriority > theirPriority) {
            // We have higher priority, take the position
            occupancy.set(key, unitId);
            // Mark the displaced unit to be moved elsewhere
            moveUpdates.set(occupyingId, { pos: { x: occupyingUnit.pos.x, y: occupyingUnit.pos.y } });
          } else {
            // We have lower priority, stay in place
            const currentKey = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
            occupancy.set(currentKey, unitId);
            moveUpdates.set(unitId, { pos: { x: unit.pos.x, y: unit.pos.y } });
          }
        }
      }
    }
    
    // Apply all movements through Transform
    for (const [unitId, update] of moveUpdates) {
      this.transform.updateUnit(unitId, update);
    }
    
    // Resolve any remaining collisions (units that started at same position)
    this.resolveOverlaps();
  }
  
  private resolveOverlaps(): void {
    // Find units at same position and separate them
    const positionMap = new Map<string, string[]>(); // position -> [unitIds]
    
    for (const unit of this.sim.units) {
      if (unit.state === 'dead') continue;
      const key = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
      
      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(unit.id);
    }
    
    // Build set of all occupied positions for checking
    const occupiedPositions = new Set<string>();
    for (const [pos, unitIds] of positionMap) {
      if (unitIds.length > 0) {
        occupiedPositions.add(pos);
      }
    }

    this.separateOverlapping(positionMap, occupiedPositions);

    // let attempts = 0;
    // let isSettled = false;
    // // We want to separate overlapping units in a loop like this
    // // this.separateOverlapping(positionMap, occupiedPositions);

    // while (!isSettled && attempts < 100) {
    //   attempts++;

    //   // Try to separate overlapping units
    //   isSettled = this.separateOverlapping(positionMap, occupiedPositions);
    // }
  }

  separateOverlapping(positionMap: Map<string, string[]>, occupiedPositions: Set<string>): boolean {
    // Separate overlapping units
    for (const [_pos, unitIds] of positionMap) {
      if (unitIds.length <= 1) continue; // No collision
      
      // Sort by priority (mass * 10 + hp) to determine who stays
      const unitsWithPriority = unitIds.map(id => {
        const unit = this.sim.units.find(u => u.id === id);
        if (!unit) return null;
        return { id, priority: (unit.mass || 1) * 10 + (unit.hp || 0), unit };
      }).filter(x => x !== null) as any[];
      
      unitsWithPriority.sort((a, b) => b.priority - a.priority);
      
      // Keep highest priority unit in place, displace others
      for (let i = 1; i < unitsWithPriority.length; i++) {
        const unit = unitsWithPriority[i].unit;
        if (!unit) continue;
        
        // Try to find an adjacent free position
        const displacements = [[1,0], [-1,0], [0,1], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1]];
        let displaced = false;
        
        for (const [dx, dy] of displacements) {
          const newX = Math.round(unit.pos.x + dx);
          const newY = Math.round(unit.pos.y + dy);
          
          // Check bounds
          if (newX < 0 || newX >= this.sim.fieldWidth || newY < 0 || newY >= this.sim.fieldHeight) {
            continue;
          }
          
          // Check if position is free
          const newKey = `${newX},${newY}`;
          if (!occupiedPositions.has(newKey)) {
            // Move unit here
            this.transform.updateUnit(unit.id, { pos: { x: newX, y: newY } });
            occupiedPositions.add(newKey); // Mark new position as occupied
            displaced = true;
            break;
          }
        }
        
        // If we couldn't displace the unit, it stays overlapped
        // This shouldn't happen in normal gameplay but prevents infinite loops
        if (!displaced) {
          // console.warn(`Could not displace unit ${unit.id} from position ${pos}`);
          return false; 
        }
      }
    }
    return true;
  }
  
  private resolveCollisionsSoA(arrays: any): void {
    // Build spatial grid for O(1) collision detection
    const grid = new Map<number, number>(); // packed position -> unit index
    const fieldWidth = this.sim.fieldWidth;
    
    // First pass: find collisions using packed positions for speed
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;
      
      // Pack position into single integer for faster map lookup
      const packedPos = Math.floor(arrays.posY[i]) * fieldWidth + Math.floor(arrays.posX[i]);
      
      const existing = grid.get(packedPos);
      if (existing !== undefined) {
        // Collision! Resolve based on priority
        const priorityI = arrays.mass[i] * 10 + arrays.hp[i];
        const priorityExisting = arrays.mass[existing] * 10 + arrays.hp[existing];
        
        const toDisplace = priorityI > priorityExisting ? existing : i;
        
        // Displace to adjacent cell (vectorized search)
        const x = Math.floor(arrays.posX[toDisplace]);
        const y = Math.floor(arrays.posY[toDisplace]);
        
        // Track if we found a new position
        let displaced = false;
        let newPackedPos = packedPos;
        
        // Try cardinal directions first (most common case)
        if (x + 1 < fieldWidth && !grid.has(packedPos + 1)) {
          arrays.posX[toDisplace] = x + 1;
          newPackedPos = packedPos + 1;
          displaced = true;
        } else if (x - 1 >= 0 && !grid.has(packedPos - 1)) {
          arrays.posX[toDisplace] = x - 1;
          newPackedPos = packedPos - 1;
          displaced = true;
        } else if (y + 1 < this.sim.fieldHeight && !grid.has(packedPos + fieldWidth)) {
          arrays.posY[toDisplace] = y + 1;
          newPackedPos = packedPos + fieldWidth;
          displaced = true;
        } else if (y - 1 >= 0 && !grid.has(packedPos - fieldWidth)) {
          arrays.posY[toDisplace] = y - 1;
          newPackedPos = packedPos - fieldWidth;
          displaced = true;
        }
        
        // Update grid with both units' positions
        if (toDisplace === existing) {
          // Existing unit was displaced
          grid.set(packedPos, i); // Winner takes original position
          if (displaced) {
            grid.set(newPackedPos, existing); // Displaced unit at new position
          }
        } else {
          // New unit was displaced
          if (displaced) {
            grid.set(newPackedPos, i); // Displaced unit at new position
          }
          // Existing stays at packedPos (already in grid)
        }
      } else {
        grid.set(packedPos, i);
      }
    }
    
    // Final bounds check to ensure no units escape
    const fieldHeight = this.sim.fieldHeight;
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      arrays.posX[i] = Math.max(0, Math.min(fieldWidth - 1, arrays.posX[i]));
      arrays.posY[i] = Math.max(0, Math.min(fieldHeight - 1, arrays.posY[i]));
    }
  }
}