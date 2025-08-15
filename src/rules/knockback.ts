import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";

export class Knockback extends Rule {
  execute(context: TickContext): void {
    // Register knockback checks as a batched intent
    const knockbackRange = 1.1;
    
    this.pairwise(context, (a, b) => {
      // Skip dead units or units without mass
      if (a.state === 'dead' || !a.mass) return;
      if (b.state === 'dead' || !b.mass) return;
      
      // Process knockback - method will determine who pushes whom
      this.processKnockback(context, a, b);
    }, knockbackRange);
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