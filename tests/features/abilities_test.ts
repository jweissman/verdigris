
import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import type { Unit, Ability } from '../../src/sim/types';

describe('Abilities Rule', () => {
  it('should trigger a simple ability after its cooldown', () => {
    const sim = new Simulator();

    // Create a unit with a self-damage ability (like explode)
    const unit: Unit = {
      id: 'unit1',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly',
      sprite: 'clanker',
      state: 'idle',
      hp: 100,
      maxHp: 100,
      mass: 1,
      abilities: ['explode'], // Self-destruct ability from JSON
      lastAbilityTick: {},
      tags: ['construct']
    };

    // Add an enemy nearby to trigger the explode ability
    const enemy: Unit = {
      id: 'enemy1',
      pos: { x: 2, y: 0 },
      intendedMove: { x: 2, y: 0 },
      team: 'hostile',
      sprite: 'worm',
      state: 'idle',
      hp: 50,
      maxHp: 50,
      mass: 1,
      abilities: {},
      lastAbilityTick: {}
    };

    sim.addUnit(unit);
    sim.addUnit(enemy);
    sim.step(); // This triggers the explode ability and queues the damage command
    sim.step(); // This processes the damage command
    
    // Explode deals 999 damage to self, unit should be dead or removed
    const unit1 = sim.units.find(u => u.id === 'unit1');
    // Unit is either dead or removed from the list
    expect(unit1 === undefined || unit1.state === 'dead').toBe(true);
  });
});
