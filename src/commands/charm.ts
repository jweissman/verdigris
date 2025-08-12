import { Command, CommandParams } from '../rules/command';
import { Transform } from '../core/transform';

/**
 * Charm command - charms a unit to change its team
 * Params:
 *   unitId: string - Unit to charm
 *   team: string - New team ('friendly', 'hostile', 'neutral')
 */
export class CharmCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    
    const transform = new Transform(this.sim);
    const team = params.team as string;
    
    if (!team) return;
    
    // Update the unit's team
    transform.updateUnit(unitId, {
      team: team as any
    });
  }
}