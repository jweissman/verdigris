import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';

describe('AOE and Knockback', () => {
  it('projectile deals AoE damage and knocks back worms', () => {
    const sim = new Simulator()
      .addUnit({ id: 'worm1', pos: { x: 3, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'hostile', sprite: 'worm', state: 'walk', hp: 10, mass: 1 })
      .addUnit({ id: 'worm2', pos: { x: 5, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'hostile', sprite: 'worm', state: 'walk', hp: 10, mass: 1 });

    sim.projectiles.push({
      id: 'p1', pos: { x: 4, y: 0 }, vel: { x: 0, y: 0 }, radius: 1, damage: 5, team: 'friendly'
    });

    sim.step();

    // Both worms should take damage and be knocked back
    expect(sim.roster.worm1.hp).toBe(5);
    expect(sim.roster.worm2.hp).toBe(5);
    // Knockback: worm1 should move left, worm2 should move right (radial from impact)
    expect(sim.roster.worm1.pos.x).toBeLessThan(3);
    expect(sim.roster.worm2.pos.x).toBeGreaterThan(4);
  });

  // note: not technically an aoe knock test?
  it('big creature knocks back small ones on collision', () => {
    const sim = new Simulator()
      .addUnit({ id: 'giant', pos: { x: 0, y: 0 }, intendedMove: { x: 1, y: 0 }, team: 'hostile', sprite: 'giant', state: 'walk', posture: 'bully', hp: 100, mass: 10 })
      .addUnit({ id: 'worm', pos: { x: 1, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'friendly', sprite: 'worm', state: 'idle', hp: 10, mass: 1 });

    sim.step(); // giant moves to (1,0), collides with worm

    // Giant should move into worm's position
    expect(sim.roster.giant.pos.x).toBeGreaterThanOrEqual(1);
    // Worm should be knocked back to the right
    expect(sim.roster.worm.pos.x).not.toBe(1);
  });
});
