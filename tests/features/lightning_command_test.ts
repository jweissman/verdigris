import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { CommandHandler } from '../../src/rules/command_handler';
import { LightningStorm } from '../../src/rules/lightning_storm';
import { EventHandler } from '../../src/rules/event_handler';

describe('Lightning Command', () => {
  it('should trigger lightning strikes via command', () => {
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new LightningStorm(sim),
      new EventHandler()
    ];

    // Test random lightning strike
    sim.queuedCommands = [{ type: 'lightning', params: {} }];
    sim.step();
    
    // Should have activated lightning storm
    expect(sim.lightningActive).toBe(true);
    
    // Should have created lightning particles
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    
    // Test targeted lightning strike
    const beforeParticles = sim.particles.length;
    sim.queuedCommands = [{ type: 'bolt', params: { x: 10, y: 10 } }];
    sim.step();
    
    const afterParticles = sim.particles.length;
    expect(afterParticles).toBeGreaterThan(beforeParticles);
    
    
    // Test alias command
    const beforeAlias = sim.particles.length;
    sim.queuedCommands = [{ type: 'lightning', params: { x: 5, y: 5 } }];
    sim.step();
    
    const afterAlias = sim.particles.length;
    expect(afterAlias).toBeGreaterThan(beforeAlias);
    
  });
});