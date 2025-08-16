import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export default class Cleanup extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const deadUnits = context
      .getAllUnits()
      .filter((unit) => unit.state === "dead" || unit.hp <= 0);

    return deadUnits.map((unit) => ({
      type: "remove",
      params: { unitId: unit.id },
    }));
  }
}
