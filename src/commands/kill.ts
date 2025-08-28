import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class Kill extends Command {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;

    if (!targetId) return;

    this.tx.updateUnit(targetId, { state: "dead" });
  }
}
