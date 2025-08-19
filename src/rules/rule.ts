import { RNG } from "../core/rng";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "../core/command_handler";

/**
 * Base class for all rules
 * Rules can ONLY access the simulator through the TickContext interface
 * This enforces proper encapsulation and prevents direct access to internal state
 */
export abstract class Rule {
  protected rng: RNG;

  constructor(rng?: RNG) {
    this.rng = rng || new RNG(12345);
  }

  abstract execute(context: TickContext): QueuedCommand[];

  /**
   * Helper for pairwise operations - processes all unit pairs
   * NOTE: shouldn't this use pairwise batching since N^2???
   */
  protected pairwise(
    context: TickContext,
    callback: (a: Unit, b: Unit) => void,
    maxDistance?: number,
  ): void {
    const units = context.getAllUnits();
    const maxDistSq = maxDistance ? maxDistance * maxDistance : Infinity;

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i];
        const b = units[j];

        if (maxDistance) {
          const dx = a.pos.x - b.pos.x;
          const dy = a.pos.y - b.pos.y;
          if (dx * dx + dy * dy > maxDistSq) continue;
        }

        callback(a, b);
      }
    }
  }

  /**
   * Helper to find units within radius
   */
  protected unitsWithinRadius(
    context: TickContext,
    center: { x: number; y: number },
    radius: number,
  ): Unit[] {
    return context.findUnitsInRadius(center, radius);
  }
}
