import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";

export default class Cleanup extends Rule {
  execute(context: TickContext): void {
    // Find dead units and queue remove commands for them
    const deadUnits = context.getAllUnits().filter(unit => unit.state === 'dead');
    
    for (const unit of deadUnits) {
      context.queueCommand({
        type: 'remove',
        params: { unitId: unit.id }
      });
    }
  }
}