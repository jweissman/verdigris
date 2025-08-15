import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";

export class Knockback extends Rule {
  execute(context: TickContext): void {
    // OPTIMIZATION: Use spatial queries instead of O(n²) pairwise
    const knockbackRange = 1.1;
    
    
    for (const unit of context.getAllUnits()) {
      // Skip dead units or units without mass
      if (unit.state === 'dead' || !unit.mass) continue;
      
      // Find nearby units to potentially knockback
      const nearbyUnits = context.findUnitsInRadius(unit.pos, knockbackRange);
      
      for (const other of nearbyUnits) {
        if (other.id === unit.id) continue;
        if (other.state === 'dead' || !other.mass) continue;
        
        // Process knockback - method will determine who pushes whom
        this.processKnockback(context, unit, other);
      }
    }
  }
  
  private processKnockback(context: TickContext, a: Unit, b: Unit): void {
    // Only process if units are on different teams
    if (a.team === b.team) return;
    
    // Calculate mass difference for knockback
    const massDiff = (a.mass || 1) - (b.mass || 1);
    if (massDiff <= 0) return; // a can't push b if not heavier
    
    // Calculate knockback direction
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // Normalize and apply knockback
      const pushX = (dx / dist) * 0.5;
      const pushY = (dy / dist) * 0.5;
      
      context.queueCommand({
        type: 'move',
        params: {
          unitId: b.id,
          dx: pushX,
          dy: pushY
        }
      });
    }
  }
}