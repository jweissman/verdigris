import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class UpdateTossCommand extends Command {
  private transform: Transform;

  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    const complete = params.complete as boolean;

    if (!targetId) return;

    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      if (complete) {
        targetUnit.pos = {
          x: params.targetX as number,
          y: params.targetY as number,
        };
        targetUnit.meta.tossing = false;
        targetUnit.meta.tossProgress = undefined;
        targetUnit.meta.tossOrigin = undefined;
        targetUnit.meta.tossTarget = undefined;
        targetUnit.meta.tossForce = undefined;
        targetUnit.meta.z = 0;
      } else {
        targetUnit.pos = {
          x: params.x as number,
          y: params.y as number,
        };
        targetUnit.meta.tossProgress = params.progress as number;
        targetUnit.meta.z = params.z as number;
      }
    }
  }
}
