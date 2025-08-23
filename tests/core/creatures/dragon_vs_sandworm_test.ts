import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';

describe('Dragon vs Sandworm Mechanics', () => {
  it('should model dragon as distinct from sandworm', () => {
    const sim = new Simulator(30, 20);


    const giantSandworm = Encyclopaedia.unit('giant-sandworm');
    const desertMegaworm = Encyclopaedia.unit('desert-megaworm');
    



    

    const dragonTemplate = {
      ...Encyclopaedia.unit('demon'), // Use demon as base template
      hp: 350,
      maxHp: 350,
      mass: 80, // Heavier than giant-sandworm (50)
      sprite: 'dragon',
      tags: ['dragon', 'flying', 'mythic', 'armored'],
      meta: {
        flying: true,
        huge: true,
        armored: true,
        armor: 8,
        fireImmune: true,

        segmented: false,
        segmentCount: 0
      }
    };

    const dragon = { ...dragonTemplate, id: 'dragon1', pos: { x: 5, y: 5 } };
    const sandworm = { ...giantSandworm, id: 'sandworm1', pos: { x: 15, y: 5 } };
    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grappler1', pos: { x: 10, y: 5 } };

    sim.addUnit(dragon);
    sim.addUnit(sandworm);  
    sim.addUnit(grappler);


    expect(dragon.meta.segmented).toBe(false);
    expect(sandworm.meta.segmented).toBe(true);
    expect(dragon.meta.flying).toBe(true);
    expect(sandworm.meta.canBurrow).toBe(true);
    expect(dragon.mass).toBeGreaterThan(sandworm.mass);






    expect(dragon.mass).toBeGreaterThan(30); // Pinned only
    expect(sandworm.mass).toBeGreaterThan(30); // Pinned only
  });

  it('should test _debugUnits functionality with dragon encounter', () => {
    const sim = new Simulator(20, 15);
    

    const grappler = { ...Encyclopaedia.unit('grappler'), id: 'grappler1', pos: { x: 5, y: 5 } };
    const sandworm = { ...Encyclopaedia.unit('giant-sandworm'), id: 'sandworm1', pos: { x: 10, y: 5 } };
    
    sim.addUnit(grappler);
    sim.addUnit(sandworm);


    

    const unitsBefore = sim.units.map(u => ({ ...u, pos: { ...u.pos }, meta: { ...u.meta } }));
    

    grappler.intendedMove = { x: 1, y: 0 };
    sandworm.intendedMove = { x: -1, y: 0 };
    
    sim.step();
    

    sim._debugUnits(unitsBefore, 'Movement Phase');
    
    expect(sim.units.length).toBeGreaterThan(2); // Includes created segments
  });

  it('should explore mountain/desert scene for dragon testing', () => {
    const sim = new Simulator(40, 25);
    

    const miner = Encyclopaedia.unit('miner');
    expect(miner.meta.canBurrow).toBe(true);
    expect(miner.tags).toContain('burrower');
    
    const mindmender = Encyclopaedia.unit('mindmender');
    expect(mindmender.tags).toContain('psychic');
    



    

    const units = [
      { ...miner, id: 'miner1', pos: { x: 5, y: 10 } },
      { ...mindmender, id: 'mindmender1', pos: { x: 7, y: 10 } },
      { ...Encyclopaedia.unit('giant-sandworm'), id: 'threat1', pos: { x: 20, y: 10 } }
    ];
    
    units.forEach(u => sim.addUnit(u));
    
    expect(sim.units.length).toBe(3);
    

    const dwarfs = sim.units.filter(u => u.tags?.includes('worker') || u.tags?.includes('psychic'));
    dwarfs.forEach(dwarf => {
      expect(dwarf.team).toBe('friendly');
    });
  });
});