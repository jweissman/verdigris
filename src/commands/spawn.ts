import { Command, CommandParams } from '../rules/command';
import { Simulator } from '../core/simulator';
import { Transform } from '../core/transform';
import { Unit } from '../types/Unit';

export class SpawnCommand extends Command {
  private transform: Transform;
  
  constructor(sim: Simulator, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: CommandParams): void {
    if (!params || !params.unit) {
      console.warn('SpawnCommand: No unit provided', params);
      return;
    }

    const unit = params.unit as Unit;
    
    // Use transform to add unit properly with double buffering
    if (this.transform) {
      this.transform.addUnit(unit);
    } else {
      // Fallback to direct add if no transform
      this.sim.addUnit(unit);
    }
  }
}