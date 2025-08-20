import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Meta command - updates a unit's metadata and/or state
 * Params:
 *   unitId: string - ID of the unit
 *   meta?: object - Metadata updates to merge
 *   state?: string - New state value
 */
export class MetaCommand extends Command {
  private transform: Transform;

  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }

  execute(unitId: string | null, params: CommandParams): void {
    const targetId = (params.unitId as string) || unitId;
    if (!targetId) return;

    const updates: any = {};

    if (params.meta) {
      updates.meta = params.meta;
    }

    if (params.state) {
      updates.state = params.state;
    }

    if (Object.keys(updates).length > 0) {
      this.transform.updateUnit(targetId, updates);
    }
  }
}
