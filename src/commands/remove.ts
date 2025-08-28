import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class RemoveCommand extends Command {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    if (!targetId) return;

    this.tx.filterUnits((unit) => unit.id !== targetId);
  }
}
