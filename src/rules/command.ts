import { Simulator } from "../simulator";

export abstract class Command {
  protected sim: Simulator;

  constructor(sim: Simulator) {
    this.sim = sim;
  }

  abstract execute(unitId: string, ...args: any[]): void;
}