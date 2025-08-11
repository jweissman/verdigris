import type { Simulator } from "../simulator";
import type { Unit } from "../types/";
import { Transaction } from "../core/transaction";

export abstract class Rule {
  simulator: Simulator;
  protected tx: Transaction | null = null;
  
  constructor(simulator: Simulator) {
    this.simulator = simulator;
  }

  execute(tx?: Transaction) {
    this.tx = tx || null;
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
