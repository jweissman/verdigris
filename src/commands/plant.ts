import { Command, CommandParams } from "../rules/command";
import type { Simulator } from "../core/simulator";
import type { Transform } from "../core/transform";

export class PlantCommand extends Command {
  constructor(sim: Simulator, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: CommandParams): void {
    const planterId = (params.unitId as string) || unitId;
    if (!planterId) return;

    const unit = this.sim.roster[planterId];
    if (!unit) return;

    const bushPosition = {
      x: Math.max(
        0,
        Math.min(this.sim.fieldWidth - 1, unit.pos.x + (params.offsetX || 0)),
      ),
      y: Math.max(
        0,
        Math.min(this.sim.fieldHeight - 1, unit.pos.y + (params.offsetY || 0)),
      ),
    };

    const occupied = Object.values(this.sim.roster).some(
      (u: any) =>
        u.pos.x === bushPosition.x &&
        u.pos.y === bushPosition.y &&
        u.state !== "dead",
    );

    if (occupied) return;

    const bushId = `bush_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bush = {
      id: bushId,
      type: "bush",
      pos: bushPosition,
      intendedMove: { x: 0, y: 0 },
      team: unit.team,
      state: "idle" as const,
      sprite: "bush",
      hp: 1,
      maxHp: 1,
      dmg: 0,
      mass: 1, // Minimal obstacle
      abilities: [],
      tags: ["terrain", "plant", "obstacle"],
      meta: {
        plantedBy: planterId,
      },
    };

    this.tx.addUnit(bush);
  }
}
