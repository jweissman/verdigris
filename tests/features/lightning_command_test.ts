import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Lightning Command', () => {
  it('should trigger lightning strikes via command', () => {
    const sim = new Simulator();
    sim.queuedCommands = [{ type: 'storm', params: { action: 'start' } }];
    sim.step();
    expect(sim.lightningActive).toBe(true);
    sim.queuedCommands = [{ type: 'lightning', params: {} }];
    sim.step(); // Process lightning command -> generates particle commands
    sim.step(); // Process particle commands -> creates actual particles
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    const beforeParticles = sim.particles.length;
    sim.queuedCommands = [{ type: 'bolt', params: { x: 10, y: 10 } }];
    sim.step();
    sim.step(); // Need second step for particles
    const afterParticles = sim.particles.length;
    expect(afterParticles).toBeGreaterThan(beforeParticles);
    const beforeAlias = sim.particles.length;
    sim.queuedCommands = [{ type: 'lightning', params: { x: 5, y: 5 } }];
    sim.step();
    sim.step(); // Need second step for particles
    const afterAlias = sim.particles.length;
    expect(afterAlias).toBeGreaterThan(beforeAlias);
  });
});