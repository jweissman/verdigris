import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class KnockbackCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.targetId as string;
    
    if (!targetId) return;
    
    // Handle both absolute position and force-based knockback
    if (params.x !== undefined && params.y !== undefined) {
      // Absolute position (from Knockback rule)
      const x = params.x as number;
      const y = params.y as number;
      
      this.transform.updateUnit(targetId, {
        pos: { x, y }
      });
    } else if (params.force) {
      // Force-based knockback
      const force = params.force as { x: number; y: number };
      
      // Find the target unit and update its position
      const targetUnit = this.sim.units.find(u => u.id === targetId);
      if (targetUnit) {
        const newPos = {
          x: targetUnit.pos.x + force.x,
          y: targetUnit.pos.y + force.y
        };
        this.transform.updateUnit(targetId, { pos: newPos });
      }
    }
  }
}