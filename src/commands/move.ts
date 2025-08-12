import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class MoveCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    const dx = params.dx as number;
    const dy = params.dy as number;
    
    if (!targetId) return;
    
    // Get Transform and find the unit directly
    const transform = this.sim.getTransform();
    const unit = this.sim.units.find(u => u.id === targetId);
    if (!unit) return;
    
    // Handle status effects
    let effectiveDx = dx;
    let effectiveDy = dy;
    
    if (unit.meta?.chilled) {
      const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
      effectiveDx *= slowFactor;
      effectiveDy *= slowFactor;
    }
    
    if (unit.meta?.stunned) {
      effectiveDx = 0;
      effectiveDy = 0;
    }
    
    // Calculate new position and clamp to field bounds
    const newX = Math.max(0, Math.min(this.sim.fieldWidth - 1, unit.pos.x + effectiveDx));
    const newY = Math.max(0, Math.min(this.sim.fieldHeight - 1, unit.pos.y + effectiveDy));
    
    // Determine facing
    let facing = unit.meta?.facing || 'right';
    if (dx > 0) {
      facing = 'right';
    } else if (dx < 0) {
      facing = 'left';
    }
    
    // Use updateUnit for single unit update - much more efficient!
    transform.updateUnit(targetId, {
      pos: { x: newX, y: newY },
      intendedMove: { x: 0, y: 0 }, // Clear intended move after applying
      meta: {
        ...unit.meta,
        facing
      }
    });
  }
}