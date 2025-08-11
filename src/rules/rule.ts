import type { Simulator } from "../core/simulator";
import type { Unit } from "../types/Unit";

export abstract class Rule {
  simulator: Simulator;
  constructor(simulator: Simulator) {
    this.simulator = simulator;
  }

  execute() {
    this.apply();
  }

  abstract apply(): void;

  protected get sim(): Simulator {
    return this.simulator;
  }

  protected pairwise(callback: (a: Unit, b: Unit) => void): void {
    for (let i = 0; i < this.sim.units.length; i++) {
      for (let j = 0; j < this.sim.units.length; j++) {
        if (i !== j) {
          callback(this.sim.units[i], this.sim.units[j]);
        }
      }
    }
  }
}
