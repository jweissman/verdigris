import { Simulator } from "../simulator";

export interface CommandParams {
  [key: string]: any;
}

export abstract class Command {
  protected sim: Simulator;

  constructor(sim: Simulator) {
    this.sim = sim;
  }

  abstract execute(unitId: string | null, params: CommandParams): void;
}