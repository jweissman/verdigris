import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Druid Summon Limits', () => {
  test('druids respect maxUses limit for summonForestCreature', () => {
    const sim = new Simulator(20, 20);
    
    // Add a single druid
    sim.addUnit({
      id: 'druid1',
      type: 'druid',
      pos: { x: 10, y: 10 },
      hp: 35,
      maxHp: 35,
      team: "friendly",
      sprite: "druid",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 4,
      abilities: ['summonForestCreature'],
      meta: {}
    });
    
    // Add an enemy to trigger combat
    sim.addUnit({
      id: 'enemy',
      type: 'soldier',
      pos: { x: 15, y: 10 },
      hp: 30,
      maxHp: 30,
      team: "hostile",
      sprite: "soldier",
      state: "idle",
      intendedMove: { x: 0, y: 0 },
      mass: 1,
      dmg: 3,
      abilities: [],
      meta: {}
    });
    
    // Run for many steps to let druid summon
    let druidSummonedCount = 0;
    const forestCreatures = ['squirrel', 'deer', 'wolf', 'bear'];
    
    for (let i = 0; i < 300; i++) {
      const beforeCount = sim.units.length;
      sim.step();
      const afterCount = sim.units.length;
      
      if (afterCount > beforeCount) {
        const numSummoned = afterCount - beforeCount;
        // Find new units and count only forest creatures
        const newUnits = sim.units.slice(-numSummoned);
        const forestSummoned = newUnits.filter(u => forestCreatures.includes(u.type)).length;
        if (forestSummoned > 0) {
          druidSummonedCount += forestSummoned;
          const types = newUnits.map(u => u.type).join(', ');
          console.log(`Step ${i}: Druid summoned ${forestSummoned} forest creatures (${types}) (total: ${druidSummonedCount})`);
        }
      }
      
      // Check druid's meta for uses
      const druid = sim.units.find(u => u.id === 'druid1');
      if (druid && druid.meta?.summonForestCreatureUses !== undefined) {
        if (i % 50 === 0 || afterCount > beforeCount) {
          console.log(`Step ${i}: Druid has used summon ${druid.meta.summonForestCreatureUses} times`);
        }
      }
    }
    
    console.log(`Total forest creatures summoned by druid: ${druidSummonedCount}`);
    
    // With maxUses: 3, druid should summon exactly 3 creatures
    expect(druidSummonedCount).toBeLessThanOrEqual(3);
  });
  
  test('4 druids in combat stay under reasonable unit count', () => {
    const sim = new Simulator(20, 20);
    
    // Add 2 friendly druids
    for (let i = 0; i < 2; i++) {
      sim.addUnit({
        id: `friendly_druid_${i}`,
        type: 'druid',
        pos: { x: 5, y: 8 + i * 4 },
        hp: 35,
        maxHp: 35,
        team: "friendly",
        sprite: "druid",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 4,
        abilities: ['summonForestCreature'],
        meta: {}
      });
    }
    
    // Add 2 hostile druids
    for (let i = 0; i < 2; i++) {
      sim.addUnit({
        id: `hostile_druid_${i}`,
        type: 'druid',
        pos: { x: 15, y: 8 + i * 4 },
        hp: 35,
        maxHp: 35,
        team: "hostile",
        sprite: "druid",
        state: "idle",
        intendedMove: { x: 0, y: 0 },
        mass: 1,
        dmg: 4,
        abilities: ['summonForestCreature'],
        meta: {}
      });
    }
    
    // Run combat
    let maxUnits = 4;
    for (let i = 0; i < 300; i++) {
      sim.step();
      maxUnits = Math.max(maxUnits, sim.units.length);
    }
    
    console.log(`Max units with 4 druids: ${maxUnits}`);
    
    // With 4 druids each summoning max 3 creatures: 4 + 12 = 16
    // Allow some buffer for any other mechanics
    expect(maxUnits).toBeLessThanOrEqual(20);
  });
});