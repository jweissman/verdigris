import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';

describe('No Rules', () => {
  test('Performance with empty rulebook', () => {
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
    sim.rulebook = [];
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    const start = performance.now();
    const iterations = 10000;
    for (let i = 0; i < iterations; i++) {
      sim.step();
    }
    const elapsed = performance.now() - start;
    const avgStep = elapsed / iterations;
    expect(avgStep).toBeLessThan(0.02);
  });
});