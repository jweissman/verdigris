import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator.ts';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Performance Tests', () => {
  const scenarios = ['simple', 'complex', 'healing', 'projectile', 'squirrel'];
  const SIMULATION_STEPS = 50;
  const EXECUTION_TIME_PER_STEP = 4; // ms per step
  const MAX_EXECUTION_TIME = SIMULATION_STEPS * EXECUTION_TIME_PER_STEP + 10; // xms per step + 10ms buffer

  scenarios.forEach(scenario => {
    it(`should run ${scenario} scenario for ${SIMULATION_STEPS} steps within ${MAX_EXECUTION_TIME}ms`, () => {
      const sim = new Simulator(32, 32);
      const loader = new SceneLoader(sim);
      
      const startTime = performance.now();
      
      // Load the scenario
      loader.loadScenario(scenario);
      const initialUnits = sim.getRealUnits().length;
      
      // Run simulation for specified steps
      for (let step = 0; step < SIMULATION_STEPS; step++) {
        sim.step();
        
        // Check for runaway unit creation
        const currentUnits = sim.getRealUnits().length;
        expect(currentUnits).toBeLessThan(100); // Sanity check - no unit explosion
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      
      // Performance assertion
      expect(executionTime).toBeLessThan(MAX_EXECUTION_TIME);
      
      // Correctness assertions
      expect(sim.units.every(u => u.pos.x >= 0 && u.pos.x < sim.fieldWidth)).toBe(true);
      expect(sim.units.every(u => u.pos.y >= 0 && u.pos.y < sim.fieldHeight)).toBe(true);
    });
  });

  it('should handle stress test with multiple megasquirrels', () => {
    const sim = new Simulator(20, 20);
    
    // Create a scenario with multiple megasquirrels and worms
    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        id: `mega${i}`,
        pos: { x: 5 + i * 5, y: 5 },
        intendedMove: { x: 0, y: 0 },
        team: 'friendly',
        sprite: 'megasquirrel',
        state: 'idle',
        hp: 40,
        maxHp: 40,
        mass: 8,
        abilities: {
          jumps: {
            name: 'Hurl Self',
            cooldown: 100,
            config: { height: 5, speed: 2, impact: { radius: 3, damage: 5 }, duration: 10 },
            target: 'closest.enemy()?.pos',
            trigger: 'distance(closest.enemy()?.pos) > 10',
            effect: (u, t) => {
              if (!t) return;
              u.meta.jumping = true;
              u.meta.jumpProgress = 0;
              u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
              u.meta.jumpTarget = t;
            }
          }
        },
        meta: { huge: true }
      });
    }
    
    // Add some worms as targets
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `worm${i}`,
        pos: { x: 10 + (i % 5) * 2, y: 10 + Math.floor(i / 5) * 2 },
        intendedMove: { x: 0, y: 0 },
        team: 'hostile',
        sprite: 'worm',
        state: 'idle',
        hp: 10,
        maxHp: 10,
        mass: 1,
        abilities: {},
        meta: {}
      });
    }
    
    const startTime = performance.now();
    const initialUnits = sim.getRealUnits().length;
    
    // Run for 30 steps to allow jumping/landing
    for (let step = 0; step < 30; step++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    
    // Should complete in reasonable time even with multiple megasquirrels
    expect(executionTime).toBeLessThan(2000); // 1.5 seconds max
  });
});