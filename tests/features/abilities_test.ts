
import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import type { Unit } from '../../src/types/Unit';
import type { Ability } from '../../src/types/Ability';

describe('Abilities Rule', () => {
  it('should trigger a simple ability after its cooldown', () => {
    const sim = new Simulator();


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
      tags: ['construct'],
      dmg: 10,
      meta: {}
    };


    const enemy: Unit = {
      id: 'enemy1',
      pos: { x: 1, y: 0 },
      intendedMove: { x: 1, y: 0 },
      team: 'hostile',
      sprite: 'worm',
      state: 'idle',
      hp: 50,
      maxHp: 50,
      mass: 1,
      abilities: [],
      lastAbilityTick: {},
      tags: [],
      dmg: 5,
      meta: {}
    };

    sim.addUnit(unit);
    sim.addUnit(enemy);
    sim.step(); // This triggers the explode ability and queues the damage command
    sim.step(); // This processes the damage command
    

    const unit1 = sim.units.find(u => u.id === 'unit1');

    expect(unit1 === undefined || unit1.state === 'dead').toBe(true);
  });
});
