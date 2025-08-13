import { Rule } from "./rule";
import type { Unit } from "../types/Unit";
import { Transform } from "../core/transform";

export class Knockback extends Rule {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  apply = () => {
    // Register knockback checks as a batched intent
    const knockbackRange = 1.1;
    
    // The batcher will call our callback for both (a,b) and (b,a)
    // So processKnockback needs to determine who pushes whom
    this.pairwise((a, b) => {
      // Skip dead units or units without mass
      if (a.state === 'dead' || !a.mass) return;
      if (b.state === 'dead' || !b.mass) return;
      
      // Process knockback - method will determine who pushes whom
      this.processKnockback(a, b);
    }, knockbackRange);
  };
  
  private processKnockback = (a: Unit, b: Unit) => {
    // Since this gets called for both (a,b) and (b,a), only process when a would push b
    // This avoids double-processing
    
    // Phantom units can push others but should never be pushed themselves
    if (b.meta.phantom) return; // Don't push phantom units (they're part of huge unit body)
    
    // Phantoms should not push their own parent
    if (a.meta.phantom && a.meta.parentId === b.id) return;
    
    
    if (a.state !== 'dead' && b.state !== 'dead' && a.mass && b.mass) {
      // Calculate effective mass - huge creatures and their phantoms are much harder to move
      // Phantoms get extra pushing power to enforce spacing
      const aEffectiveMass = a.meta.phantom ? a.mass * 5 : (a.meta.huge ? a.mass * 3 : a.mass);
      const bEffectiveMass = b.meta.huge ? b.mass * 3 : b.mass;
      
      // Only process if a would push b (heavier pushes lighter)
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
            // Units are exactly on top of each other - use deterministic direction based on IDs
            // This ensures consistent behavior in tests
            const hashCode = (a.id + b.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const angle = (hashCode % 8) * (Math.PI / 4); // 8 cardinal/diagonal directions
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
              // Use Transform to update position in pending buffer
              this.transform.updateUnit(b.id, {
                pos: { x: newX, y: newY }
              });
            }
            // If can't move, don't knock back at all
          } else {
            // Normal unit knockback - use Transform
            const clampedX = Math.max(0, Math.min(newX, this.sim.fieldWidth - 1));
            const clampedY = Math.max(0, Math.min(newY, this.sim.fieldHeight - 1));
            this.transform.updateUnit(b.id, {
              pos: { x: clampedX, y: clampedY }
            });
          }
        }
      }
    }
  };

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
