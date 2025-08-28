import { Simulator } from "../core/simulator";
import { Transform } from "../core/transform";

export interface CommandParams {
  [key: string]: any;
}

export abstract class Command {
  protected sim: Simulator;

  protected tx: Transform;

  constructor(
    sim: Simulator,
    // TODO: replace sim with transform + dataquery
    tx?: Transform,
  ) {
    this.sim = sim;

    this.tx = tx;
  }

  abstract execute(unitId: string | null, params: CommandParams): void;
}
