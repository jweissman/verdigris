import { Command } from "../rules/command";
import { LightningStorm } from '../rules/lightning_storm';

export class Lightning extends Command {
  execute(unitId: string | null, x?: string, y?: string) {
    const lightningRule = this.sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    
    if (!lightningRule) {
      console.log('⚡ No lightning storm system found. Add LightningStorm to rulebook first.');
      return;
    }

    if (!this.sim.lightningActive) {
      // Start storm if not active
      LightningStorm.createLightningStorm(this.sim);
    }

    let targetPos;
    if (x && y) {
      // Strike at specific position
      targetPos = { x: parseInt(x), y: parseInt(y) };
    }
    // Otherwise strike at random position (default behavior)

    lightningRule.generateLightningStrike(targetPos);
    
    const posStr = targetPos ? `at (${targetPos.x}, ${targetPos.y})` : 'at random location';
    console.log(`⚡ Lightning bolt strikes ${posStr}!`);
  }
}