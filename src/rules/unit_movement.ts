import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
export class UnitMovement extends Rule {
  static wanderRate: number = 0.15;
  execute(context: TickContext): void {
    context.queueCommand({
      type: 'forces',
      params: {}
    });
    return;
  }
}
