import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class Kill extends Command {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    
    if (!targetId) return;
    
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        return {
          ...unit,
          state: 'dead'
        };
      }
      return unit;
    });
  }
}