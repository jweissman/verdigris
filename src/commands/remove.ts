import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class RemoveCommand extends Command {
  private transform: Transform;

  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    if (!targetId) return;

    this.transform.filterUnits((unit) => unit.id !== targetId);
  }
}
