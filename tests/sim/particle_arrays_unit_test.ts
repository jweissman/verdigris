import { describe, expect, it } from 'bun:test';
import { ParticleArrays } from '../../src/sim/particle_arrays';

describe('ParticleArrays Unit Tests', () => {
  it('should properly initialize particle lifetime', () => {
    const arrays = new ParticleArrays(10);
    
    const idx = arrays.addParticle({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test'
    });
    
    expect(arrays.lifetime[idx]).toBe(100);
    expect(arrays.active[idx]).toBe(1);
  });
  
  it('should decrement lifetime by 1 per physics update', () => {
    const arrays = new ParticleArrays(10);
    
    const idx = arrays.addParticle({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      lifetime: 100,
      type: 'test'
    });
    
    arrays.updatePhysics();
    
    expect(arrays.lifetime[idx]).toBe(99);
    expect(arrays.active[idx]).toBe(1);
    
    arrays.updatePhysics();
    
    expect(arrays.lifetime[idx]).toBe(98);
    expect(arrays.active[idx]).toBe(1);
  });
  
  it('should deactivate particle when lifetime reaches 0', () => {
    const arrays = new ParticleArrays(10);
    
    const idx = arrays.addParticle({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      lifetime: 2,
      type: 'test'
    });
    
    expect(arrays.active[idx]).toBe(1);
    
    arrays.updatePhysics();
    expect(arrays.active[idx]).toBe(1);
    
    arrays.updatePhysics();
    expect(arrays.active[idx]).toBe(0);
  });
  
  it('should handle Int16Array limits for lifetime', () => {
    const arrays = new ParticleArrays(10);
    

    const idx = arrays.addParticle({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      lifetime: 30000,
      type: 'test'
    });
    
    expect(arrays.lifetime[idx]).toBe(30000);
    

    const idx2 = arrays.addParticle({
      pos: { x: 100, y: 100 },
      vel: { x: 0, y: 0 },
      lifetime: 40000,
      type: 'test'
    });
    

    expect(arrays.lifetime[idx2]).toBeLessThan(32768);
  });
});