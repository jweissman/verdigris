import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class CleanupCommand extends Command {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    if (!params.unitId) return;

    this.tx.filterUnits((unit) => unit.id !== params.unitId);
  }
}
