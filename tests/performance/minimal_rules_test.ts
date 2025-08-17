import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Minimal Rules Test', () => {
  test('Which rules are actually needed?', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 20,
        abilities: []
      });
    }
    

    console.log('\n=== Testing with reduced rulebook ===');
    

    const originalRulebook = [...sim.rulebook];
    

    sim.rulebook = [
      originalRulebook.find(r => r.constructor.name === 'UnitBehavior'),
      originalRulebook.find(r => r.constructor.name === 'UnitMovement'),
    ].filter(Boolean);
    
    console.log('Rulebook size:', sim.rulebook.length);
    

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      sim.step();
    }
    const elapsed = performance.now() - start;
    const avgStep = elapsed / 1000;
    
    console.log(`With minimal rules: ${avgStep.toFixed(4)}ms per step`);
    console.log(`Budget: 0.01ms, Actual: ${avgStep.toFixed(4)}ms (${(avgStep / 0.01).toFixed(1)}x over)`);
    

    sim.rulebook = [];
    
    const start2 = performance.now();
    for (let i = 0; i < 1000; i++) {
      sim.step();
    }
    const elapsed2 = performance.now() - start2;
    const avgStep2 = elapsed2 / 1000;
    
    console.log(`\nWith NO rules: ${avgStep2.toFixed(4)}ms per step`);
    console.log(`This is the overhead of the system itself`);
  });
});