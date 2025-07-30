import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';

describe('Projectile simulation', () => {
  it('should move a projectile each step', () => {
    const sim = new Simulator();
    sim.projectiles = [
      { id: 'p1', pos: { x: 0, y: 0 }, vel: { x: 2, y: 0 }, radius: 1, damage: 1, team: 'friendly' }
    ];
    sim.step();
    expect(sim.projectiles[0].pos.x).toBe(2);
    expect(sim.projectiles[0].pos.y).toBe(0);
  });

  it('should not move a projectile with zero velocity', () => {
    const sim = new Simulator();
    sim.projectiles = [
      { id: 'p2', pos: { x: 5, y: 5 }, vel: { x: 0, y: 0 }, radius: 1, damage: 1, team: 'hostile' }
    ];
    sim.step();
    expect(sim.projectiles[0].pos.x).toBe(5);
    expect(sim.projectiles[0].pos.y).toBe(5);
  });

  it('should allow adding projectiles dynamically', () => {
    const sim = new Simulator();
    expect(sim.projectiles.length).toBe(0);
    sim.projectiles.push({ id: 'p3', pos: { x: 1, y: 1 }, vel: { x: 0, y: 1 }, radius: 1, damage: 1, team: 'friendly' });
    expect(sim.projectiles.length).toBe(1);
    sim.step();
    expect(sim.projectiles[0].pos.x).toBe(1);
    expect(sim.projectiles[0].pos.y).toBe(2);
  });

  it('should create a projectile when a unit receives a fire command', () => {
    const sim = new Simulator()
      .addUnit({ id: 'shooter', pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, team: 'friendly', sprite: 'tiny', state: 'idle', hp: 10, mass: 1 })
      .addUnit({ id: 'target', pos: { x: 3, y: 0 }, vel: { x: 0, y: 0 }, team: 'hostile', sprite: 'worm', state: 'idle', hp: 10, mass: 1 });

    // Shooter receives a fire command targeting 'target'
    sim.accept({
      commands: {
        shooter: [{ action: 'fire', target: 'target' }]
      }
    });

    // Should create a projectile at shooter's position, aimed at target
    expect(sim.projectiles.length).toBe(1);
    const proj = sim.projectiles[0];
    expect(proj.pos.x).toBe(0);
    expect(proj.pos.y).toBe(0);
    // Should be aimed at (3,0)
    expect(proj.vel.x).toBeGreaterThan(0);
    expect(proj.vel.y).toBeCloseTo(0, 5);
    expect(proj.team).toBe('friendly');
  });
});
