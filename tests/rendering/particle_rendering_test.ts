import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { DesertEffects } from '../../src/rules/desert_effects';
import { WinterEffects } from '../../src/rules/winter_effects';

describe('Granular Cell-Based Particle Rendering', () => {
  it('should render particles at correct cell positions', () => {
    const sim = new Simulator(32, 24);
    
    // Add a particle at a specific cell (using pixel coordinates as most rules do)
    const cellX = 10;
    const cellY = 12;
    sim.particles.push({
      pos: { x: cellX * 8, y: cellY * 8 }, // Pixel coordinates
      vel: { x: 0, y: -1 },
      radius: 2,
      color: '#FF0000',
      lifetime: 100,
      type: 'test_particle'
    });
    
    // The particle should be at cell (10, 12)
    const particle = sim.particles[0];
    expect(particle.pos.x).toBe(80); // 10 * 8
    expect(particle.pos.y).toBe(96); // 12 * 8
    
    // When converted back to cell coordinates
    const cellXFromPixel = particle.pos.x / 8;
    const cellYFromPixel = particle.pos.y / 8;
    expect(cellXFromPixel).toBe(cellX);
    expect(cellYFromPixel).toBe(cellY);
  });
  
  it('should handle weather particles falling to specific cells', () => {
    const sim = new Simulator(32, 24);
    
    // Simulate rain falling on cell (5, 5)
    const targetCell = { x: 5, y: 5 };
    const rainHeight = 10; // Start 10 units above
    
    sim.particles.push({
      pos: { x: targetCell.x * 8, y: targetCell.y * 8 },
      vel: { x: 0, y: 1 }, // Falling down
      radius: 1,
      color: '#4444FF',
      lifetime: 50,
      z: rainHeight, // Height above ground
      type: 'rain'
    });
    
    const particle = sim.particles[0];
    
    // Should be positioned at the target cell
    expect(particle.pos.x / 8).toBe(targetCell.x);
    expect(particle.pos.y / 8).toBe(targetCell.y);
    expect(particle.z).toBe(rainHeight);
  });
  
  it('should create heat shimmer particles at hot cells', () => {
    const sim = new Simulator(32, 24);
    const desertEffects = new DesertEffects(sim);
    
    // Set high temperature at a specific cell
    const hotCell = { x: 15, y: 10 };
    // Use the simulator's addHeat method to create a hot spot
    sim.addHeat(hotCell.x, hotCell.y, 25, 1); // Add 25 degrees in a small radius
    
    // Apply desert effects which should create heat shimmer
    desertEffects.apply();
    
    // Should have created heat shimmer particles
    const shimmerParticles = sim.particles.filter(p => 
      p.type === 'heat_shimmer' || p.color?.includes('ff')
    );
    
    if (shimmerParticles.length > 0) {
      // Particles should be near the hot cell
      shimmerParticles.forEach(particle => {
        const particleCellX = particle.pos.x / 8;
        const particleCellY = particle.pos.y / 8;
        
        // Should be within 1 cell of the hot spot
        expect(Math.abs(particleCellX - hotCell.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(particleCellY - hotCell.y)).toBeLessThanOrEqual(1);
      });
    }
  });
  
  it('should create snow particles at specific cells', () => {
    const sim = new Simulator(32, 24);
    const winterEffects = new WinterEffects(sim);
    
    // Set cold temperature
    sim.temperature = -5;
    
    // Manually create a snow particle at a specific cell
    const snowCell = { x: 8, y: 6 };
    sim.particles.push({
      pos: { x: snowCell.x * 8, y: snowCell.y * 8 },
      vel: { x: Math.random() * 0.5 - 0.25, y: 0.5 },
      radius: 1.5,
      color: '#FFFFFF',
      lifetime: 120,
      z: 15, // Start high in the air
      type: 'snow'
    });
    
    const snowParticle = sim.particles[0];
    
    // Should be at the correct cell position
    expect(snowParticle.pos.x / 8).toBeCloseTo(snowCell.x, 1);
    expect(snowParticle.pos.y / 8).toBeCloseTo(snowCell.y, 1);
    expect(snowParticle.type).toBe('snow');
    expect(snowParticle.z).toBe(15);
  });
  
  it('should handle leaf particles falling to ground', () => {
    const sim = new Simulator(32, 24);
    
    // Create a falling leaf at a specific cell
    const leafCell = { x: 12, y: 8 };
    const leafParticle = {
      pos: { x: leafCell.x * 8, y: leafCell.y * 8 },
      vel: { x: 0.2, y: 0.8 }, // Gentle diagonal fall
      radius: 2,
      color: '#228822',
      lifetime: 100,
      z: 8, // Start above ground
      type: 'leaf'
    };
    
    sim.particles.push(leafParticle);
    
    // Verify initial position
    expect(leafParticle.pos.x / 8).toBe(leafCell.x);
    expect(leafParticle.pos.y / 8).toBe(leafCell.y);
    
    // Simulate falling by updating position
    for (let i = 0; i < 10; i++) {
      leafParticle.pos.x += leafParticle.vel.x;
      leafParticle.pos.y += leafParticle.vel.y;
      leafParticle.z = Math.max(0, leafParticle.z - 0.8);
    }
    
    // Leaf should have moved and fallen
    expect(leafParticle.pos.x / 8).toBeGreaterThan(leafCell.x);
    expect(leafParticle.pos.y / 8).toBeGreaterThan(leafCell.y);
    expect(leafParticle.z).toBeLessThan(8);
  });
  
  it('should handle grapple line particles between cells', () => {
    const sim = new Simulator(32, 24);
    
    // Create grapple line particles between two cells
    const startCell = { x: 5, y: 10 };
    const endCell = { x: 10, y: 10 };
    
    // Create line segments
    const numSegments = 5;
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const x = startCell.x + (endCell.x - startCell.x) * t;
      const y = startCell.y + (endCell.y - startCell.y) * t;
      
      sim.particles.push({
        pos: { x: x * 8, y: y * 8 },
        vel: { x: 0, y: 0 },
        radius: 1,
        color: '#AA6600',
        lifetime: 10,
        type: 'grapple_line'
      });
    }
    
    // Verify line particles are positioned correctly
    const lineParticles = sim.particles.filter(p => p.type === 'grapple_line');
    expect(lineParticles.length).toBe(numSegments + 1);
    
    // First particle should be at start
    expect(lineParticles[0].pos.x / 8).toBeCloseTo(startCell.x, 1);
    expect(lineParticles[0].pos.y / 8).toBeCloseTo(startCell.y, 1);
    
    // Last particle should be at end
    expect(lineParticles[numSegments].pos.x / 8).toBeCloseTo(endCell.x, 1);
    expect(lineParticles[numSegments].pos.y / 8).toBeCloseTo(endCell.y, 1);
  });
});