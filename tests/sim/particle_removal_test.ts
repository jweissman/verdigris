import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Particle Removal Debug', () => {
  it('should track why particles are removed', () => {
    const sim = new Simulator();
    const fieldWidthPx = sim.fieldWidth * 8;
    const fieldHeightPx = sim.fieldHeight * 8;
    
    // Add particle in safe zone
    const idx = sim.particleArrays.addParticle({
      pos: { x: fieldWidthPx / 2, y: fieldHeightPx / 2 }, // Dead center
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test_particle'
    });
    
    console.log('Field size:', fieldWidthPx, 'x', fieldHeightPx);
    console.log('Particle pos:', sim.particleArrays.posX[idx], sim.particleArrays.posY[idx]);
    console.log('Before step - active:', sim.particleArrays.active[idx]);
    console.log('Before step - lifetime:', sim.particleArrays.lifetime[idx]);
    
    // Override updatePhysics to see what happens
    const origUpdate = sim.particleArrays.updatePhysics.bind(sim.particleArrays);
    let updateCount = 0;
    sim.particleArrays.updatePhysics = function() {
      updateCount++;
      console.log('updatePhysics call', updateCount);
      origUpdate();
    };
    
    sim.step();
    
    console.log('After step - active:', sim.particleArrays.active[idx]);
    console.log('After step - lifetime:', sim.particleArrays.lifetime[idx]);
    console.log('After step - pos:', sim.particleArrays.posX[idx], sim.particleArrays.posY[idx]);
    console.log('updatePhysics called', updateCount, 'times');
    
    // Particle should still be active
    expect(sim.particleArrays.active[idx]).toBe(1);
    expect(sim.particleArrays.lifetime[idx]).toBe(99); // Only decremented once
  });
});