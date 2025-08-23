import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('AOE and Knockback', () => {
  it('projectile deals AoE damage and knocks back worms', () => {
    const sim = new Simulator();
    sim.addUnit({ id: 'worm1', pos: { x: 3, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'hostile', sprite: 'worm', state: 'walk', hp: 10, maxHp: 10, mass: 1 });
    sim.addUnit({ id: 'worm2', pos: { x: 5, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'hostile', sprite: 'worm', state: 'walk', hp: 10, maxHp: 10, mass: 1 });

    sim.projectiles.push({
      id: 'p1', pos: { x: 4, y: 0 }, vel: { x: 0, y: 0 }, radius: 1, damage: 5, team: 'friendly',
      type: 'bomb', lifetime: 31, explosionRadius: 2  // Make it a bomb that will explode
    });

    sim.step();
    sim.step(); // Additional step to process queued damage events



    expect(sim.roster['worm1'].hp).toBe(7); // 10 - 3
    expect(sim.roster['worm2'].hp).toBe(7); // 10 - 3

    expect(sim.roster['worm1'].pos.x).toBeLessThan(3);
    expect(sim.roster['worm2'].pos.x).toBeGreaterThan(5);
  });


  it('big creature knocks back small ones on collision', () => {
    const sim = new Simulator();

    sim.addUnit({ id: 'giant', pos: { x: 0, y: 0 }, intendedMove: { x: 1, y: 0 }, team: 'hostile', sprite: 'giant', state: 'walk', hp: 100, mass: 10 });
    sim.addUnit({ id: 'worm', pos: { x: 1, y: 0 }, intendedMove: { x: 0, y: 0 }, team: 'friendly', sprite: 'worm', state: 'idle', hp: 10, mass: 1 });

    sim.step();


    expect(sim.roster['giant'].pos.x).toBeGreaterThanOrEqual(1);

    const wormMoved = sim.roster['worm'].pos.x !== 1 || sim.roster['worm'].pos.y !== 0;
    expect(wormMoved).toBe(true);
  });
});
