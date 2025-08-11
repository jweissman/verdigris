import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class SetIntendedMoveCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    const dx = params.dx as number;
    const dy = params.dy as number;
    
    if (!targetId) return;
    
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        return {
          ...unit,
          intendedMove: { x: dx, y: dy }
        };
      }
      return unit;
    });
  }
}