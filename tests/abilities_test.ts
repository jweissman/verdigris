
import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import type { Unit, Ability } from '../src/sim/types';

describe('Abilities Rule', () => {
  it('should trigger a simple ability after its cooldown', () => {
    const sim = new Simulator();

    const testAbility: Ability = {
      name: 'test_effect',
      cooldown: 5, // ticks
      trigger: 'true',
      effect: (unit: Unit) => {
        unit.hp -= 1;
      },
    };

    const unit: Unit = {
      id: 'unit1',
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly',
      sprite: 'test_sprite',
      state: 'idle',
      hp: 10,
      maxHp: 10,
      mass: 1,
      abilities: { 'test_effect': testAbility },
      lastAbilityTick: {},
    };

    sim.addUnit(unit);
    sim.tick();
    expect(sim.roster.unit1.hp).toBe(9);
  });
});
