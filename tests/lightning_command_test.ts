import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import { CommandHandler } from '../src/rules/command_handler';
import { LightningStorm } from '../src/rules/lightning_storm';
import { EventHandler } from '../src/rules/event_handler';

describe('Lightning Command', () => {
  it('should trigger lightning strikes via command', () => {
    console.log('⚡ Testing lightning command...');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new LightningStorm(sim),
      new EventHandler(sim)
    ];

    // Test random lightning strike
    sim.queuedCommands = [{ type: 'lightning', args: [] }];
    sim.step();
    
    // Should have activated lightning storm
    expect(sim.lightningActive).toBe(true);
    
    // Should have created lightning particles
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    console.log(`✅ Random lightning strike created ${lightningParticles.length} particles`);
    
    // Test targeted lightning strike
    const beforeParticles = sim.particles.length;
    sim.queuedCommands = [{ type: 'bolt', args: ['10', '10'] }];
    sim.step();
    
    const afterParticles = sim.particles.length;
    expect(afterParticles).toBeGreaterThan(beforeParticles);
    
    console.log('✅ Targeted lightning strike at (10, 10) successful');
    
    // Test alias command
    const beforeAlias = sim.particles.length;
    sim.queuedCommands = [{ type: 'lightning', args: ['5', '5'] }];
    sim.step();
    
    const afterAlias = sim.particles.length;
    expect(afterAlias).toBeGreaterThan(beforeAlias);
    
    console.log('✅ Lightning command works with both "lightning" and "bolt" aliases');
  });
});