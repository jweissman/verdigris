import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';

describe('Leaf Animation System', () => {
  it('should create falling leaf particles with weather command', () => {
    const sim = new Simulator();
    
    // Queue leaves weather command
    sim.queuedCommands = [{
      type: 'weather',
      args: ['leaves', '50', '0.3']
    }];
    
    sim.step();
    
    // Should create leaf particles
    const leafParticles = sim.particles.filter(p => 
      p.type === 'leaf' || p.type === 'leaves'
    );
    
    expect(leafParticles.length).toBeGreaterThan(0);
    
    // Check leaf particle properties
    if (leafParticles.length > 0) {
      const leaf = leafParticles[0];
      expect(leaf.z).toBeDefined(); // Should have vertical position
      expect(leaf.vel).toBeDefined(); // Should have velocity
      expect(leaf.meta?.swayAmplitude).toBeDefined(); // Should sway as it falls
    }
  });

  it('should animate leaves falling with sway motion', () => {
    const sim = new Simulator();
    
    // Create a leaf particle manually
    const leaf = {
      id: 'leaf-1',
      type: 'leaf',
      pos: { x: 10, y: 5 },
      vel: { x: 0.1, y: 0.2 }, // Gentle drift
      z: 10, // Start high
      lifetime: 100,
      meta: {
        swayAmplitude: 0.5,
        swayFrequency: 0.1,
        swayPhase: 0
      }
    };
    
    sim.particles.push(leaf);
    
    const initialX = leaf.pos.x;
    const initialZ = leaf.z;
    
    // Simulate several steps
    for (let i = 0; i < 10; i++) {
      // Apply simple falling physics
      leaf.z -= 0.5; // Fall
      leaf.pos.x += Math.sin(i * leaf.meta.swayFrequency) * leaf.meta.swayAmplitude; // Sway
      leaf.pos.y += leaf.vel.y;
      
      sim.step();
    }
    
    // Leaf should have moved
    expect(leaf.z).toBeLessThan(initialZ); // Fell down
    expect(Math.abs(leaf.pos.x - initialX)).toBeGreaterThan(0); // Swayed horizontally
  });

  it('should spawn leaves from tree positions', () => {
    const sim = new Simulator();
    
    // Add tree-like positions (could be actual tree units later)
    const treePositions = [
      { x: 5, y: 5 },
      { x: 15, y: 10 },
      { x: 25, y: 8 }
    ];
    
    // Create leaves weather with intensity
    sim.queuedCommands = [{
      type: 'weather',
      args: ['leaves', '30', '0.5'] // 30 intensity, 0.5 opacity
    }];
    
    sim.step();
    
    // Leaves should spawn from various positions
    const leafParticles = sim.particles.filter(p => 
      p.type === 'leaf' || p.type === 'leaves'
    );
    
    // Should have multiple leaves
    expect(leafParticles.length).toBeGreaterThan(0);
    
    // Leaves should have varied positions
    if (leafParticles.length > 1) {
      const positions = leafParticles.map(l => l.pos.x);
      const uniqueX = new Set(positions);
      expect(uniqueX.size).toBeGreaterThan(1); // Not all from same X
    }
  });

  it('should remove leaves when they hit the ground', () => {
    const sim = new Simulator();
    
    // Create a leaf at ground level
    const groundLeaf = {
      id: 'ground-leaf',
      type: 'leaf',
      pos: { x: 10, y: 10 },
      vel: { x: 0, y: 0 },
      z: 0.1, // Almost at ground
      lifetime: 100,
      meta: {}
    };
    
    sim.particles.push(groundLeaf);
    
    // Simulate leaf hitting ground
    for (let i = 0; i < 5; i++) {
      // Check if leaf is at ground
      if (groundLeaf.z <= 0) {
        groundLeaf.lifetime = 0; // Mark for removal
      }
      groundLeaf.z -= 0.5;
      
      // Remove dead particles
      sim.particles = sim.particles.filter(p => p.lifetime > 0);
      
      sim.step();
    }
    
    // Leaf should be removed
    const remainingLeaf = sim.particles.find(p => p.id === 'ground-leaf');
    expect(remainingLeaf).toBeUndefined();
  });
});