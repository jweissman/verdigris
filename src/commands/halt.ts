import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Halt command - stops a unit's movement and clears any movement intent
 * Params:
 *   unitId: string - ID of the unit to halt
 */
export class HaltCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.unitId as string || unitId;
    if (!targetId) return;
    
    this.transform.updateUnit(targetId, {
      intendedMove: { x: 0, y: 0 },
      // Could also clear other movement-related state here
      // For example: meta.running = false, meta.charging = false, etc.
    });
  }
}