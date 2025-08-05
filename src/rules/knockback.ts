import { Rule } from "./rule";
import type { Unit } from "../sim/types";

export class Knockback extends Rule {
  apply = () => this.pairwise((a: Unit, b: Unit) => {
    // Phantom units can push others but should never be pushed themselves
    if (b.meta.phantom) return; // Don't push phantom units (they're part of huge unit body)
    
    // Phantoms should not push their own parent
    if (a.meta.phantom && a.meta.parentId === b.id) return;
    
    
    if (a.state !== 'dead' && b.state !== 'dead' && a.mass && b.mass) {
      // Calculate effective mass - huge creatures and their phantoms are much harder to move
      // Phantoms get extra pushing power to enforce spacing
      const aEffectiveMass = a.meta.phantom ? a.mass * 5 : (a.meta.huge ? a.mass * 3 : a.mass);
      const bEffectiveMass = b.meta.huge ? b.mass * 3 : b.mass;
      
      if (aEffectiveMass > bEffectiveMass) {
        const dx = a.pos.x - b.pos.x;
        const dy = a.pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 1.1) {
          
          // Phantom units always push (they represent the megasquirrel's body)
          // But don't knock back huge creatures unless the mass difference is very large OR it's a phantom pushing
          if (b.meta.huge && !a.meta.phantom && aEffectiveMass < bEffectiveMass * 2) {
            return;
          }
          
          const knockback = 1.5;
          let nx, ny;
          
          if (dist === 0) {
            // Units are exactly on top of each other - push in a random direction
            const angle = Math.random() * 2 * Math.PI;
            nx = Math.cos(angle);
            ny = Math.sin(angle);
          } else {
            nx = (b.pos.x - a.pos.x) / dist;
            ny = (b.pos.y - a.pos.y) / dist;
          }
          
          const newX = Math.round(b.pos.x + nx * knockback);
          const newY = Math.round(b.pos.y + ny * knockback);
          
          // For huge creatures, validate that the entire body can move to the new position
          if (b.meta.huge) {
            if (this.canHugeUnitMoveTo(b, newX, newY, a)) {
              b.pos.x = newX;
              b.pos.y = newY;
            }
            // If can't move, don't knock back at all
          } else {
            // Normal unit knockback
            b.pos.x = Math.max(0, Math.min(newX, this.sim.fieldWidth - 1));
            b.pos.y = Math.max(0, Math.min(newY, this.sim.fieldHeight - 1));
          }
        }
      }
    }
  });

  private canHugeUnitMoveTo(unit: Unit, newX: number, newY: number, excludeUnit?: Unit): boolean {
    // Check if all body cells of a huge unit can move to the new position
    const bodyOffsets = [
      { x: 0, y: 0 }, // Head
      { x: 0, y: 1 }, // Body segment 1
      { x: 0, y: 2 }, // Body segment 2
      { x: 0, y: 3 }  // Body segment 3
    ];
    
    for (const offset of bodyOffsets) {
      const checkX = newX + offset.x;
      const checkY = newY + offset.y;
      
      // Check boundaries
      if (checkX < 0 || checkX >= this.sim.fieldWidth || checkY < 0 || checkY >= this.sim.fieldHeight) {
        return false;
      }
      
      // Check if new position would be blocked (excluding this unit and the unit pushing it)
      // If there's an excludeUnit (the one doing the pushing), we need to ignore it and its phantoms
      let occupied = false;
      if (excludeUnit) {
        // Check occupancy while excluding both the unit being moved and the unit doing the pushing
        for (const otherUnit of this.sim.units) {
          if (otherUnit === unit || otherUnit === excludeUnit) continue;
          if (otherUnit.meta.phantom && (otherUnit.meta.parentId === unit.id || otherUnit.meta.parentId === excludeUnit.id)) continue;
          
          const otherPositions = this.sim.getHugeUnitBodyPositions ? this.sim.getHugeUnitBodyPositions(otherUnit) : [otherUnit.pos];
          for (const pos of otherPositions) {
            if (pos.x === checkX && pos.y === checkY) {
              occupied = true;
              break;
            }
          }
          if (occupied) break;
        }
      } else {
        occupied = this.sim.isApparentlyOccupied(checkX, checkY, unit);
      }
      
      if (occupied) {
        return false;
      }
    }
    
    return true;
  }
}
