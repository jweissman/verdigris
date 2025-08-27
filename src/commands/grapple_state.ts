import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * GrappleState command - updates a unit's grappling state
 * Params:
 *   unitId: string - ID of the unit  
 *   hit?: boolean - Whether unit was hit by a grapple
 *   grapplerID?: string - ID of the unit that grappled this one
 *   origin?: {x, y} - Origin point of the grapple
 *   release?: boolean - Release the grapple
 */
export class GrappleState extends Command {
  private transform: Transform;

  constructor(sim: any, transform?: Transform) {
    super(sim);
    this.transform = transform || sim.getTransform();
  }

  execute(unitId: string | null, params: CommandParams): void {
    const targetId = (params.unitId as string) || unitId;
    if (!targetId) {
      return;
    }

    const meta: any = {};

    if (params.hit !== undefined) {
      meta.grappleHit = params.hit;
    }

    if (params.grapplerID !== undefined) {
      meta.grapplerID = params.grapplerID;
    }

    if (params.origin !== undefined) {
      meta.grappleOrigin = params.origin;
    }

    if (params.release) {
      meta.grappleHit = false;
      meta.grapplerID = null;
      meta.grappleOrigin = null;
    }

    if (Object.keys(meta).length > 0) {
      this.transform.updateUnit(targetId, { meta });
    }
  }
}