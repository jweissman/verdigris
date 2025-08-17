import { Command } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Wander command - makes units move randomly
 * Parameters:
 *   team: string - Which team should wander (friendly, hostile, neutral, all)
 *   chance: number - Probability of wandering each tick (0-1)
 */
export class Wander extends Command {
  constructor(sim: Simulator, transform?: any) {
    super(sim);
  }

  execute(unitId: string | null, params: any): void {
    const team = params.team || "all";
    const chance = parseFloat(params.chance) || 0.1;

    const units = this.sim.units.filter((u) => {
      if (team === "all") return true;
      return u.team === team;
    });

    for (const unit of units) {
      if (unit.state === "dead") continue;

      const hasNearbyEnemy = this.sim.units.some(
        (other) =>
          other.team !== unit.team &&
          other.state !== "dead" &&
          Math.abs(other.pos.x - unit.pos.x) <= 3 &&
          Math.abs(other.pos.y - unit.pos.y) <= 3,
      );

      if (!hasNearbyEnemy && Simulator.rng.random() < chance) {
        const roll = Simulator.rng.random();
        const dx = roll < 0.5 ? -1 : 1;
        const dy = Simulator.rng.random() < 0.5 ? -1 : 1;

        const newX = unit.pos.x + dx;
        const newY = unit.pos.y + dy;

        const context = this.sim.getTickContext();
        if (
          newX >= 0 &&
          newX < context.getFieldWidth() &&
          newY >= 0 &&
          newY < context.getFieldHeight()
        ) {
          this.sim.getTransform().updateUnit(unit.id, {
            intendedMove: { x: dx, y: dy },
          });
        }
      }
    }
  }
}
