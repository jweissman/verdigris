
import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import type { Unit } from '../../../src/types/Unit';

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
      pos: { x: 1, y: 0 }, // Within explode trigger range (distance <= 3)
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
    
    const initialEnemyHp = enemy.hp;
    
    sim.step(); // This triggers the explode ability and queues the damage command
    sim.step(); // This processes the damage command
    
    const unit1 = sim.units.find(u => u.id === 'unit1');
    const enemy1 = sim.units.find(u => u.id === 'enemy1');


    expect(unit1).toBeUndefined();
    

    expect(enemy1).toBeDefined();
    expect(enemy1!.hp).toBeLessThan(initialEnemyHp);

    const damageTaken = initialEnemyHp - enemy1!.hp;
    expect(damageTaken).toBeGreaterThan(0);
    expect(damageTaken).toBeLessThanOrEqual(initialEnemyHp);
    

    const aoeEvents = sim.processedEvents.filter(e => e.kind === 'aoe');
    expect(aoeEvents.length).toBeGreaterThan(0);
    expect(['impact', 'explosive']).toContain(aoeEvents[0].meta?.aspect);
    expect(aoeEvents[0].meta?.radius).toBe(3);
  });
});
