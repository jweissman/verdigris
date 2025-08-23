import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { ParticleArrays } from '../../src/sim/particle_arrays';

describe('Particle Boundary and Landing Logic', () => {
  it('should not remove particles within bounds', () => {
    const sim = new Simulator();
    

    const idx = sim.particleArrays.addParticle({
      pos: { x: sim.fieldWidth * 4, y: sim.fieldHeight * 4 }, // Center in pixels
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test_particle'
    });
    
    expect(sim.particleArrays.active[idx]).toBe(1);
    
    sim.step();
    

    expect(sim.particleArrays.active[idx]).toBe(1);
  });
  
  it('should land snow particles at correct height', () => {
    const sim = new Simulator();
    const fieldHeightPx = sim.fieldHeight * 8;
    

    const idx = sim.particleArrays.addParticle({
      pos: { x: 50, y: fieldHeightPx - 1.01 }, // Will land after one step with vel 0.15
      vel: { x: 0, y: 0.15 },
      lifetime: 100,
      type: 'snow'
    });
    
    expect(sim.particleArrays.landed[idx]).toBe(0);
    
    sim.step();
    

    expect(sim.particleArrays.active[idx]).toBe(1); // Still active
    expect(sim.particleArrays.landed[idx]).toBe(1); // But landed
    expect(sim.particleArrays.posY[idx]).toBe(fieldHeightPx - 1); // At landing position
    expect(sim.particleArrays.velY[idx]).toBe(0); // Stopped moving
  });
  
  it('should handle storm clouds without removing them', () => {
    const sim = new Simulator();
    

    const indices = [];
    for (let i = 0; i < 8; i++) {
      const idx = sim.particleArrays.addParticle({
        pos: { 
          x: 100 + i * 100,
          y: 100 + i * 100
        },
        vel: { x: (Math.random() - 0.5) * 0.2, y: 0 },
        radius: 0.5,
        color: '#333366',
        lifetime: 180,
        type: 'storm_cloud'
      });
      indices.push(idx);
    }
    

    for (const idx of indices) {
      expect(sim.particleArrays.active[idx]).toBe(1);
    }
    
    sim.step();
    

    let activeCount = 0;
    for (const idx of indices) {
      if (sim.particleArrays.active[idx] === 1) activeCount++;
    }
    expect(activeCount).toBe(8);
  });
  
  it('should remove particles that go out of bounds', () => {
    const sim = new Simulator();
    const fieldWidthPx = sim.fieldWidth * 8;
    const fieldHeightPx = sim.fieldHeight * 8;
    

    const idx = sim.particleArrays.addParticle({
      pos: { x: fieldWidthPx + 100, y: fieldHeightPx + 100 },
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test_particle'
    });
    
    expect(sim.particleArrays.active[idx]).toBe(1);
    
    sim.step();
    

    expect(sim.particleArrays.active[idx]).toBe(0);
  });
});