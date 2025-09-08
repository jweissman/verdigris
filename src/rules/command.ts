import { Simulator } from "../core/simulator";
import { Transform } from "../core/transform";
import { BaseCommandParams } from "../types/CommandParams";

// Legacy alias for backwards compatibility
export type CommandParams = BaseCommandParams;

export abstract class Command<TParams extends BaseCommandParams = BaseCommandParams> {
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

  abstract execute(unitId: string | null, params: TParams): void;
}
