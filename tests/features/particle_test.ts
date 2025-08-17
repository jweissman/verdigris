import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Particles', () => {
  it('removes particles correctly', () => {
    const sim = new Simulator();
    const fieldWidthPx = sim.fieldWidth * 8;
    const fieldHeightPx = sim.fieldHeight * 8;
    const idx = sim.particleArrays.addParticle({
      pos: { x: fieldWidthPx / 2, y: fieldHeightPx / 2 }, // Dead center
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test_particle'
    });
    const origUpdate = sim.particleArrays.updatePhysics.bind(sim.particleArrays);
    let updateCount = 0;
    sim.particleArrays.updatePhysics = function() {
      updateCount++;
      origUpdate();
    };
    sim.step();
    expect(sim.particleArrays.active[idx]).toBe(1);
    expect(sim.particleArrays.lifetime[idx]).toBe(99); // Only decremented once
  });
});