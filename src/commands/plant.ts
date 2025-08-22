import { Command, CommandParams } from "../rules/command";
import type { Simulator } from "../core/simulator";

export class PlantCommand extends Command {
  constructor(sim: Simulator) {
    super(sim);
  }

  execute(unitId: string | null, params: CommandParams): void {
    if (!unitId) return;
    
    const unit = this.sim.roster[unitId];
    if (!unit) return;

    // Plant a bush at the unit's current position or nearby
    const bushPosition = {
      x: Math.max(0, Math.min(this.sim.fieldWidth - 1, unit.pos.x + (params.offsetX || 0))),
      y: Math.max(0, Math.min(this.sim.fieldHeight - 1, unit.pos.y + (params.offsetY || 0)))
    };

    // Check if position is empty
    const occupied = Object.values(this.sim.roster).some((u: any) => 
      u.pos.x === bushPosition.x && u.pos.y === bushPosition.y && u.state !== 'dead'
    );

    if (occupied) return;

    // Create a bush unit
    const bushId = `bush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bush = {
      id: bushId,
      type: 'bush',
      pos: bushPosition,
      intendedMove: { x: 0, y: 0 },
      team: unit.team,
      state: 'idle' as const,
      sprite: 'bush',
      hp: 15,
      maxHp: 15,
      dmg: 0,
      mass: 5, // Bushes are heavy and block movement
      abilities: [],
      tags: ['terrain', 'plant', 'obstacle'],
      meta: {
        plantedBy: unitId
      }
    };

    this.sim.addUnit(bush);
  }
}