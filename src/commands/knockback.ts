import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class KnockbackCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.targetId as string;
    const force = params.force as { x: number; y: number };
    
    if (!targetId || !force) return;
    
    // Apply knockback using Transform
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        return {
          ...unit,
          pos: {
            x: unit.pos.x + force.x,
            y: unit.pos.y + force.y
          }
        };
      }
      return unit;
    });
  }
}