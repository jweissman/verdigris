import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Guard command - designate unit to protect
 * params: { unitId, protecteeId }
 */
export class GuardCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: CommandParams): void {
    const id = params.unitId as string || unitId;
    const protecteeId = params.protecteeId as string | undefined;
    if (!id) return;
    
    const unit = this.sim.units.find(u => u.id === id);
    if (!unit) return;
    
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, intendedProtectee: protecteeId }
    });
  }
}