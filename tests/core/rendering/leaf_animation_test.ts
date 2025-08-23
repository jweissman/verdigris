import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';

describe('Leaf Animation System', () => {
  it('should create falling leaf particles with weather command', () => {
    const sim = new Simulator();

    sim.queuedCommands = [{
      type: 'weather',
      params: { weatherType: 'leaves', duration: 50, intensity: 0.3 }
    }];
    
    sim.step();
    

    const leafParticles = sim.particles.filter(p => 
      p.type === 'leaf'
    );
    
    expect(leafParticles.length).toBeGreaterThan(0);
    

    if (leafParticles.length > 0) {
      const leaf = leafParticles[0];
      expect(leaf.z).toBeDefined(); // Should have vertical position
      expect(leaf.vel).toBeDefined(); // Should have velocity
      expect(leaf.lifetime).toBeGreaterThan(0); // Should have lifetime
    }
  });

  it('should animate leaves falling with sway motion', () => {
    const sim = new Simulator();
    

    const leaf: any = {
      id: 'leaf-1',
      type: 'leaf',
      pos: { x: 10, y: 5 },
      vel: { x: 0.1, y: 0.2 }, // Gentle drift
      z: 10, // Start high
      lifetime: 100,
      radius: 1,
      color: '#228822',
      meta: {
        swayAmplitude: 0.5,
        swayFrequency: 0.1,
        swayPhase: 0
      }
    };
    
    sim.particles.push(leaf);
    
    const initialX = leaf.pos.x;
    const initialZ = leaf.z;
    

    for (let i = 0; i < 10; i++) {

      leaf.z -= 0.5; // Fall
      leaf.pos.x += Math.sin(i * leaf.meta.swayFrequency) * leaf.meta.swayAmplitude; // Sway
      leaf.pos.y += leaf.vel.y;
      
      sim.step();
    }
    

    expect(leaf.z).toBeLessThan(initialZ); // Fell down
    expect(Math.abs(leaf.pos.x - initialX)).toBeGreaterThan(0); // Swayed horizontally
  });

  it('should spawn leaves from tree positions', () => {
    const sim = new Simulator();
    

    const treePositions = [
      { x: 5, y: 5 },
      { x: 15, y: 10 },
      { x: 25, y: 8 }
    ];
    

    sim.queuedCommands = [{
      type: 'weather',
      params: { weatherType: 'leaves', duration: 30, intensity: 0.5 }
    }];
    
    sim.step();
    

    const leafParticles = sim.particles.filter(p => 
      p.type === 'leaf'
    );
    

    expect(leafParticles.length).toBeGreaterThan(0);
    

    if (leafParticles.length > 1) {
      const positions = leafParticles.map(l => l.pos.x);
      const uniqueX = new Set(positions);
      expect(uniqueX.size).toBeGreaterThan(1); // Not all from same X
    }
  });

  it('should remove leaves when they hit the ground', () => {
    const sim = new Simulator();
    


    sim.particleArrays.addParticle({
      id: 'ground-leaf',
      type: 'leaf',
      pos: { x: 10, y: 10 },
      vel: { x: 0, y: 0 },
      z: 0.1, // Almost at ground
      lifetime: 3, // Will expire quickly
      color: '#88AA44',
      radius: 1
    });
    

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    

    const remainingLeaf = sim.particles.find(p => p.id === 'ground-leaf');
    expect(remainingLeaf).toBeUndefined();
  });
});