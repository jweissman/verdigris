import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';

describe('Dragon Test', () => {
  it('should create exactly 1 dragon + 8 segments', () => {
    const sim = new Simulator(20, 15);
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 10, y: 8 } };
    sim.addUnit(dragon);
    sim.step();
    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon'));
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(segments.length).toBe(8);
    expect(dragonUnits.length).toBe(12); // 1 head + 3 phantoms + 8 segments
  });

  it('should create dragon and lancer units from units.json', () => {
    const dragon = Encyclopaedia.unit('dragon');
    const lancer = Encyclopaedia.unit('lancer');
    

    expect(dragon.hp).toBe(400);
    expect(dragon.mass).toBe(100);
    expect(dragon.tags).toContain('dragon');
    expect(dragon.tags).toContain('flying');
    expect(dragon.tags).toContain('segmented');
    expect(dragon.meta.segmented).toBe(true);
    expect(dragon.meta.segmentCount).toBe(8);
    expect(dragon.meta.armor).toBe(10);
    expect(dragon.meta.flying).toBe(true);
    

    expect(lancer.hp).toBe(45);
    expect(lancer.tags).toContain('anti-armor');
    expect(lancer.tags).toContain('dragon-hunter');
    expect(lancer.abilities).toContain('harpoonChain');
    expect(lancer.meta.armorPiercing).toBe(8);
    expect(lancer.meta.harpoonRange).toBe(12);
  });

  it('should create dragon with segments in simulation', () => {
    const sim = new Simulator(30, 20);
    
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 15, y: 10 } };
    sim.addUnit(dragon);
    

    sim.step();
    

    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon') && !u.meta.phantom);
    expect(dragonUnits.length).toBe(9); // 1 head + 8 segments

    

    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(segments.length).toBe(8);
    
    segments.forEach(segment => {

      expect(segment.meta.huge).toBeUndefined();
      expect(segment.meta.width).toBe(96); // Inherit size
      expect(segment.meta.height).toBe(64);
    });
  });

  it('should test dragon vs lancer grappling mechanics', () => {
    const sim = new Simulator(25, 15);
    
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 15, y: 10 } };
    const lancer = { ...Encyclopaedia.unit('lancer'), id: 'lancer1', pos: { x: 5, y: 10 } };
    const normalGrappler = { ...Encyclopaedia.unit('grappler'), id: 'grappler1', pos: { x: 5, y: 8 } };
    
    sim.addUnit(dragon);
    sim.addUnit(lancer);
    sim.addUnit(normalGrappler);
    

    expect(dragon.mass).toBeGreaterThan(30);
    

    expect(lancer.meta.armorPiercing).toBeGreaterThan(0);
    expect(lancer.meta.harpoonRange as number).toBeGreaterThan((normalGrappler.meta.grapplingRange as number) || 8);
    

    expect(sim.units.length).toBeGreaterThanOrEqual(3);
  });

  it('should demonstrate dragon encounter scenario', () => {
    const sim = new Simulator(40, 30);
    

    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 20, y: 15 } };
    const lancer1 = { ...Encyclopaedia.unit('lancer'), id: 'lancer1', pos: { x: 5, y: 10 } };
    const lancer2 = { ...Encyclopaedia.unit('lancer'), id: 'lancer2', pos: { x: 5, y: 20 } };
    const wormHunter = { ...Encyclopaedia.unit('worm-hunter'), id: 'hunter1', pos: { x: 10, y: 15 } };
    
    [dragon, lancer1, lancer2, wormHunter].forEach(u => sim.addUnit(u));
    




    

    for (let i = 0; i < 3; i++) {
      const before = sim.units.length;
      sim.step();
      const after = sim.units.length;
      
      if (after > before) {

      }
    }
    

    const dragonSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(dragonSegments.length).toBe(8);
    

  });

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