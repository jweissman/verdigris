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
      const unit = this.sim.units.find((u) => u.id === targetId);
      if (unit) {
        // Start with existing meta
        updates.meta = { ...unit.meta };
        
        // Apply updates, treating undefined as "delete"
        for (const [key, value] of Object.entries(params.meta)) {
          if (value === undefined) {
            delete updates.meta[key];
          } else {
            updates.meta[key] = value;
          }
        }
      }
    }

    if (params.state) {
      updates.state = params.state;
    }

    if (Object.keys(updates).length > 0) {
      this.transform.updateUnit(targetId, updates);
    }
  }
}
