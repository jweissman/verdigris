import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Face command - set unit's facing direction
 * params: { unitId, direction: 'left' | 'right' }
 */
export class FaceCommand extends Command {
  private transform: Transform;

  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }

  execute(unitId: string | null, params: CommandParams): void {
    const id = (params.unitId as string) || unitId;
    const direction = params.direction as "left" | "right";
    if (!id || !direction) return;

    const unit = this.sim.units.find((u) => u.id === id);
    if (!unit) return;

    this.transform.updateUnit(id, {
      meta: { ...unit.meta, facing: direction },
    });
  }
}
