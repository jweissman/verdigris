import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class UnitBehavior extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    return [
      {
        type: "ai",
        params: {},
      },
    ];
  }
}
