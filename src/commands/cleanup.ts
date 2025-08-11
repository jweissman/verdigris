import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class CleanupCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    if (!params.unitId) return;
    
    // Use Transform to remove the dead unit
    this.transform.filterUnits(unit => unit.id !== params.unitId);
  }
}