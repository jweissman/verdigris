import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";
import { Transform } from "../core/transform";
import { Unit } from "../types/Unit";
import Encyclopaedia from "../dmg/encyclopaedia";

export class SpawnCommand extends Command {
  private transform: Transform;

  constructor(sim: Simulator, transform: Transform) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: CommandParams): void {
    let unit: Unit;

    if (params.unit) {
      unit = params.unit as Unit;
    } else if (params.unitType) {
      try {
        const unitData = Encyclopaedia.unit(params.unitType as string);
        if (!unitData) {
          console.warn(`SpawnCommand: Unknown unit type '${params.unitType}'`);
          return;
        }

        unit = {
          ...unitData,
          id:
            this.sim.units.length === 0
              ? (params.unitType as string)
              : `${params.unitType}${this.sim.units.length}`,
          pos: {
            x:
              params.x !== undefined
                ? (params.x as number)
                : Math.floor(Math.random() * this.sim.fieldWidth),
            y:
              params.y !== undefined
                ? (params.y as number)
                : Math.floor(Math.random() * this.sim.fieldHeight),
          },
          team: (params.team || unitData.team || "neutral") as
            | "friendly"
            | "hostile"
            | "neutral",
        };
      } catch (e) {
        console.warn(
          `SpawnCommand: Failed to create unit of type '${params.unitType}':`,
          e,
        );
        return;
      }
    } else {
      console.warn("SpawnCommand: No unit or unitType provided", params);
      return;
    }

    if (this.transform) {
      this.transform.addUnit(unit);
    } else {
      this.sim.addUnit(unit);
    }
  }
}
