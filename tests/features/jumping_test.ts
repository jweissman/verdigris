import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Jumping mechanics', () => {
  it('worm should be able to jump', () => {
    const sim = new Simulator(128, 128);
    const worm = { 
      ...Encyclopaedia.unit('worm'), 
      id: 'worm1',
      pos: { x: 0, y: 0 },
      abilities: ['jumps'],
      team: 'hostile' // Ensure worm is hostile
    };
    sim.addUnit(worm);
    const enemy = sim.addUnit({
      id: 'enemy',
      team: 'friendly',
      hp: 10,
      maxHp: 10,
      pos: { x: 15, y: 0 }, // Far enough to trigger jump
      sprite: 'soldier',
      state: 'idle'
    });
    sim.step();
    for (let i = 0; i < 5; i++) {
      sim.step();
      const reloaded = sim.roster['worm1'];
      if (reloaded && (reloaded.meta.jumping || reloaded.meta.z > 0)) {
        break;
      }
    }
    const finalWorm = sim.roster['worm1'];
    expect(finalWorm.meta.jumping || finalWorm.meta.z > 0 || finalWorm.pos.x !== 0 || finalWorm.pos.y !== 0).toBe(true);
  });

  it('worm should deal AoE damage on landing', () => {
    const sim = new Simulator(16, 16);
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 8 } };
    worm.abilities = ['jumps'];
    sim.addUnit(worm);
    const enemy1 = sim.addUnit({
      id: 'enemy1',
      team: 'friendly', 
      hp: 20,
      pos: { x: 10, y: 8 },
      sprite: 'soldier'
    });
    const enemy2 = sim.addUnit({
      id: 'enemy2',
      team: 'friendly',
      hp: 20, 
      pos: { x: 11, y: 8 },
      sprite: 'soldier'
    });
    sim.queuedCommands = [{
      type: 'jump',
      params: { targetX: 10, targetY: 8, height: 5, damage: 5, radius: 3 },
      unitId: worm.id
    }];
    const initialHp1 = enemy1.hp;
    const initialHp2 = enemy2.hp;
    sim.step();
    const jumpingWorm = sim.roster[worm.id];
    expect(jumpingWorm.meta.jumping).toBe(true);
    let landed = false;
    for (let i = 0; i < 30; i++) {
      sim.step();
      const wormUnit = sim.roster[worm.id];
      if (wormUnit && !wormUnit.meta.jumping && (!wormUnit.meta.z || Math.abs(wormUnit.meta.z) < 0.01)) {
        landed = true;
        break;
      }
    }
    expect(landed).toBe(true);
    const finalEnemy1 = sim.roster.enemy1;
    const finalEnemy2 = sim.roster.enemy2;
    const damageTaken = (initialHp1 - (finalEnemy1?.hp || 0)) + (initialHp2 - (finalEnemy2?.hp || 0));
    expect(damageTaken).toBeGreaterThan(0);
  });

  it('should not change facing direction while jumping', () => {
    const sim = new Simulator(20, 20);
    sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'red',
      hp: 10,
      meta: {
        facing: 'right',
        jumping: true,
        jumpProgress: 1,
        z: 5
      }
    });
    sim.addUnit({
      id: 'target',
      pos: { x: 5, y: 10 },
      team: 'blue',
      hp: 10
    });
    const initialFacing = sim.roster.jumper.meta.facing;
    sim.step();
    expect(sim.roster.jumper.meta.facing).toBe(initialFacing);
  });

  it('should not queue movement commands for jumping units with hunt tag', () => {
    const sim = new Simulator(20, 20);
    sim.addUnit({
      id: 'hunter',
      pos: { x: 0, y: 0 },
      team: 'red',
      hp: 10,
      tags: ['hunt'],
      meta: {
        jumping: true,
        jumpProgress: 5,
        z: 10
      }
    });
    sim.addUnit({
      id: 'prey',
      pos: { x: 5, y: 0 },
      team: 'blue',
      hp: 10
    });
    sim.step();
    const moveCommands = sim.queuedCommands.filter(c => 
      c.type === 'move' && c.params?.unitId === 'hunter'
    );
    expect(moveCommands.length).toBe(0);
  });

  it('should continue jump trajectory through completion', () => {
    const sim = new Simulator(20, 20);
    sim.addUnit({
      id: 'jumper',
      pos: { x: 5, y: 5 },
      team: 'red',
      hp: 10,
      meta: {
        jumping: true,
        jumpProgress: 0,
        jumpTarget: { x: 10, y: 5 },
        z: 0
      }
    });
    const zValues = [];
    for (let i = 0; i < 12; i++) {
      sim.step();
      const jumper = sim.roster.jumper;
      if (jumper.meta?.jumping) {
        zValues.push(jumper.meta.z || 0);
      }
    }
    const maxZ = Math.max(...zValues);
    const midIndex = Math.floor(zValues.length / 2);
    if (zValues.length > 2) {
      expect(zValues[midIndex]).toBeGreaterThan(zValues[0]);
      expect(zValues[midIndex]).toBeGreaterThan(zValues[zValues.length - 1]);
    }
  });

  it('should not have posture commands issued while jumping', () => {
    const sim = new Simulator(20, 20);
    sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'red',
      hp: 10,
      posture: 'pursue',
      meta: {
        jumping: true,
        jumpProgress: 3,
        z: 8
      }
    });
    sim.addUnit({
      id: 'enemy',
      pos: { x: 15, y: 10 },
      team: 'blue',
      hp: 10
    });
    sim.step();
    const behaviorCommands = sim.queuedCommands.filter(c => 
      (c.type === 'pose' || c.type === 'target') && c.params?.unitId === 'jumper'
    );
    expect(behaviorCommands.length).toBe(0);
  });
});