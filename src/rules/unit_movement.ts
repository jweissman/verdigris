import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class UnitMovement extends Rule {
  static wanderRate: number = 0.15;
  execute(context: TickContext): QueuedCommand[] {
    return [
      {
        type: "forces",
        params: {},
      },
    ];
  }
}
