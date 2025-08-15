import { Command, CommandParams } from '../rules/command';
import { Simulator } from '../core/simulator';
import { Transform } from '../core/transform';
import { Unit } from '../types/Unit';
import Encyclopaedia from '../dmg/encyclopaedia';

export class SpawnCommand extends Command {
  private transform: Transform;
  
  constructor(sim: Simulator, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: CommandParams): void {
    let unit: Unit;

    if (params.unit) {
      // Case 1: Full unit object provided
      unit = params.unit as Unit;
    } else if (params.unitType) {
      // Case 2: Deploy-style parameters (unitType, x, y, team)
      try {
        const unitData = Encyclopaedia.unit(params.unitType as string);
        if (!unitData) {
          console.warn(`SpawnCommand: Unknown unit type '${params.unitType}'`);
          return;
        }
        
        unit = {
          ...unitData,
          id: `${params.unitType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          pos: {
            x: params.x as number || Math.floor(Math.random() * this.sim.fieldWidth),
            y: params.y as number || Math.floor(Math.random() * this.sim.fieldHeight)
          },
          team: (params.team || 'neutral') as 'friendly' | 'hostile' | 'neutral'
        };
      } catch (e) {
        console.warn(`SpawnCommand: Failed to create unit of type '${params.unitType}':`, e);
        return;
      }
    } else {
      console.warn('SpawnCommand: No unit or unitType provided', params);
      return;
    }
    
    // Use transform to add unit properly with double buffering
    if (this.transform) {
      this.transform.addUnit(unit);
    } else {
      // Fallback to direct add if no transform
      this.sim.addUnit(unit);
    }
  }
}