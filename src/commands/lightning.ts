import type { Simulator } from '../simulator';
import { LightningStorm } from '../rules/lightning_storm';

export function lightning(sim: Simulator, x?: string, y?: string): string {
  const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
  
  if (!lightningRule) {
    return '⚡ No lightning storm system found. Add LightningStorm to rulebook first.';
  }

  if (!sim.lightningActive) {
    // Start storm if not active
    LightningStorm.createLightningStorm(sim);
  }

  let targetPos;
  if (x && y) {
    // Strike at specific position
    targetPos = { x: parseInt(x), y: parseInt(y) };
  }
  // Otherwise strike at random position (default behavior)

  lightningRule.generateLightningStrike(targetPos);
  
  const posStr = targetPos ? `at (${targetPos.x}, ${targetPos.y})` : 'at random location';
  return `⚡ Lightning bolt strikes ${posStr}!`;
}