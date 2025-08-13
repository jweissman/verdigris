import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Determinism Validation', () => {
  it('should produce identical results with same seed', () => {
    // Reset RNG to known seed
    Simulator.rng.reset(42);
    
    const sim1 = new Simulator(10, 10);
    sim1.addUnit({ id: 'test1', pos: { x: 5, y: 5 }, intendedMove: { x: 0, y: 0 }, team: 'friendly', sprite: 'soldier', state: 'idle', hp: 10, maxHp: 10, mass: 1 });
    
    // Get some random values from sim1
    const random1a = Simulator.rng.random();
    const random1b = Simulator.rng.random();
    const random1c = Simulator.rng.random();
    
    // Reset to same seed
    Simulator.rng.reset(42);
    
    const sim2 = new Simulator(10, 10);
    sim2.addUnit({ id: 'test2', pos: { x: 5, y: 5 }, intendedMove: { x: 0, y: 0 }, team: 'friendly', sprite: 'soldier', state: 'idle', hp: 10, maxHp: 10, mass: 1 });
    
    // Get same random values from sim2
    const random2a = Simulator.rng.random();
    const random2b = Simulator.rng.random();
    const random2c = Simulator.rng.random();
    
    // Should be identical
    expect(random1a).toBe(random2a);
    expect(random1b).toBe(random2b);
    expect(random1c).toBe(random2c);
  });

  it('should catch Math.random usage and redirect to seeded RNG', () => {
    // This should trigger our protection warning
    let warningCaught = false;
    
    const originalWarn = console.warn;
    console.warn = (message: string) => {
      if (message.includes('NON-DETERMINISTIC Math.random()')) {
        warningCaught = true;
      }
    };
    
    try {
      const sim = new Simulator(); // This should set up protection
      const randomValue = Math.random(); // This should trigger warning
      
      expect(warningCaught).toBe(true);
      expect(randomValue).toBeGreaterThanOrEqual(0);
      expect(randomValue).toBeLessThan(1);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('should have all simulations use seeded RNG for particles', () => {
    Simulator.rng.reset(123);
    
    const sim = new Simulator();
    sim.weather = { type: 'rain', intensity: 0.5 };
    
    // Step simulation multiple times to generate particles
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const particles1 = sim.particles.length;
    
    // Reset and repeat with same seed
    Simulator.rng.reset(123);
    
    const sim2 = new Simulator();
    sim2.weather = { type: 'rain', intensity: 0.5 };
    
    for (let i = 0; i < 5; i++) {
      sim2.step();
    }
    
    const particles2 = sim2.particles.length;
    
    // Should generate same number of particles
    expect(particles1).toBe(particles2);
  });
});