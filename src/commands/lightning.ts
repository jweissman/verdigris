import { Command, CommandParams } from "../rules/command";
import { LightningStorm } from "../rules/lightning_storm";
import { TickContextImpl } from "../core/tick_context";

/**
 * Lightning command - creates a lightning strike
 * Params:
 *   x?: number - X position for strike (optional, random if not provided)
 *   y?: number - Y position for strike (optional, random if not provided)
 */
export class Lightning extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const lightningRule = this.sim.rules.find(
      (r) => r instanceof LightningStorm,
    ) as LightningStorm;

    if (!lightningRule) {
      console.warn(
        "⚡ No lightning storm system found. Add LightningStorm to rulebook first.",
      );
      return;
    }

    if (!this.sim.lightningActive) {
      LightningStorm.createLightningStorm(this.sim);
    }

    const x = params.x as number | undefined;
    const y = params.y as number | undefined;

    let targetPos;
    if (x !== undefined && y !== undefined) {
      targetPos = { x, y };
    }

    const context = new TickContextImpl(this.sim);
    lightningRule.generateLightningStrike(context, targetPos);
  }
}
