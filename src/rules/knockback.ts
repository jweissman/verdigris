import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "./command_handler";

export class Knockback extends Rule {
  private commands: QueuedCommand[] = [];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const knockbackRange = 1.1;

    for (const unit of context.getAllUnits()) {
      if (unit.state === "dead" || !unit.mass) continue;

      const nearbyUnits = context.findUnitsInRadius(unit.pos, knockbackRange);

      for (const other of nearbyUnits) {
        if (other.id === unit.id) continue;
        if (other.state === "dead" || !other.mass) continue;

        this.processKnockback(context, unit, other);
      }
    }

    return this.commands;
  }

  private processKnockback(context: TickContext, a: Unit, b: Unit): void {
    if (a.team === b.team) return;

    const massDiff = (a.mass || 1) - (b.mass || 1);
    if (massDiff <= 0) return;

    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const pushX = (dx / dist) * 0.5;
      const pushY = (dy / dist) * 0.5;

      this.commands.push({
        type: "move",
        params: {
          unitId: b.id,
          dx: pushX,
          dy: pushY,
        },
      });
    }
  }
}
