import { Command, CommandParams } from "../rules/command";
import { LightningStorm } from '../rules/lightning_storm';

/**
 * Lightning command - creates a lightning strike
 * Params:
 *   x?: number - X position for strike (optional, random if not provided)
 *   y?: number - Y position for strike (optional, random if not provided)
 */
export class Lightning extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const lightningRule = this.sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    
    if (!lightningRule) {
      console.log('⚡ No lightning storm system found. Add LightningStorm to rulebook first.');
      return;
    }

    if (!this.sim.lightningActive) {
      // Start storm if not active
      LightningStorm.createLightningStorm(this.sim);
    }

    const x = params.x as number | undefined;
    const y = params.y as number | undefined;
    
    let targetPos;
    if (x !== undefined && y !== undefined) {
      // Strike at specific position
      targetPos = { x, y };
    }
    // Otherwise strike at random position (default behavior)

    lightningRule.generateLightningStrike(targetPos);
    
    const posStr = targetPos ? `at (${targetPos.x}, ${targetPos.y})` : 'at random location';
    console.log(`⚡ Lightning bolt strikes ${posStr}!`);
  }
}