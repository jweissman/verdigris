import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Pose command - change unit's tactical posture
 * params: { unitId, posture: 'wait' | 'guard' | 'pursue' | 'bully' }
 */
export class PoseCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }
  
  execute(unitId: string | null, params: CommandParams): void {
    const id = params.unitId as string || unitId;
    if (!id) return;
    const unit = this.sim.units.find(u => u.id === id);
    if (!unit) return;
    
    this.transform.updateUnit(id, {
      meta: { ...unit.meta, posture: params.posture as string }
    });
  }
}