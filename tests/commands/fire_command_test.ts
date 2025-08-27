import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Fire Command', () => {
  it('should start a fire at specified location', () => {
    const sim = new Simulator(20, 20);
    
    // Start fire at specific location
    sim.queuedCommands = [{ type: 'fire', params: { x: 10, y: 10, temperature: 800 } }];
    sim.step();
    
    // Process temperature commands that were queued
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Check temperature was set
    if (sim.temperatureField) {
      const centerTemp = sim.temperatureField.get(10, 10);
      expect(centerTemp).toBeGreaterThan(700);
      
      // Check temperature spreads with falloff
      const nearbyTemp = sim.temperatureField.get(11, 10);
      expect(nearbyTemp).toBeGreaterThan(300);
      expect(nearbyTemp).toBeLessThan(centerTemp);
    }
    
    // Check fire particles were created
    const fireParticles = sim.particles.filter(p => p.type === 'fire');
    expect(fireParticles.length).toBeGreaterThan(0);
  });
});