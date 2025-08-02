
import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import type { Unit } from '../src/sim/types';
import { Jumping } from '../src/rules/jumping';
import { MeleeCombat } from '../src/rules/melee_combat';
import { Knockback } from '../src/rules/knockback';
import { UnitBehavior } from '../src/rules/unit_behavior';

describe('Jumping mechanics', () => {
  it('worm should be able to jump', () => {
    const sim = new Simulator();

    const worm: Unit = {
      id: "worm",
      team: 'hostile',
      abilities: {
        jumps: {
          name: 'fling',
          cooldown: 10,
          config: { height: 5, speed: 2 },
          target: 'random.position()',
          effect: (u, t) => {
            console.log(`Worm ${u.id} jumping to target:`, t);
            u.meta.jumping = true;
            u.meta.jumpProgress = 0;
            u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
            u.meta.jumpTarget = t;
          },
        },
      },
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      sprite: 'worm',
      meta: {}
    };

    sim.addUnit(worm);
    sim.tick();

    let reloaded = sim.roster.worm;

    expect(reloaded.meta.jumping).toBe(true);
    console.log("worm meta:", reloaded.meta);
    expect(reloaded.meta.z).toBeGreaterThan(0);
  });

  it('jumping worm should not be targetable by melee attacks', () => {
    const sim = new Simulator();

    const worm: Unit = {
      id: "worm",
      sprite: 'worm',
      team: 'hostile',
      abilities: {
        jumps: {
          name: 'fling',
          cooldown: 10,
          config: { height: 5, speed: 2 },
          target: 'random.position()',
          effect: (u, t) => {
            console.log(`Worm ${u.id} jumping to target:`, t);
            u.meta.jumping = true;
            u.meta.jumpProgress = 0;
            u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
            u.meta.jumpTarget = t;
          },
        },
      },
      state: 'idle',
      hp: 10, maxHp: 10,
      pos: { x: 0, y: 0 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      meta: {}
    };

    const soldier: Unit = {
      id: "2",
      sprite: 'soldier',
      team: 'friendly',
      abilities: {},
      state: 'idle',
      hp: 10, maxHp: 12,
      pos: { x: 1, y: 0 },
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      intendedTarget: worm.id,
      meta: {}
      // jumping: false,
      // jumpProgress: 0,
    };

    sim.addUnit(worm);
    sim.addUnit(soldier);

    // Tick once to initiate the jump
    sim.tick();

    expect(sim.roster.worm.meta.jumping).toBe(true);

    // Tick again to see if the soldier attacks
    sim.tick();

    expect(sim.roster.worm.hp).toBeLessThan(10);
  });

  
});
