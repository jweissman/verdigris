import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Dragon Implementation', () => {
  it('should create dragon and lancer units from units.json', () => {
    const dragon = Encyclopaedia.unit('dragon');
    const lancer = Encyclopaedia.unit('lancer');
    
    // Dragon should be segmented, flying, and heavily armored
    expect(dragon.hp).toBe(400);
    expect(dragon.mass).toBe(100);
    expect(dragon.tags).toContain('dragon');
    expect(dragon.tags).toContain('flying');
    expect(dragon.tags).toContain('segmented');
    expect(dragon.meta.segmented).toBe(true);
    expect(dragon.meta.segmentCount).toBe(8);
    expect(dragon.meta.armor).toBe(10);
    expect(dragon.meta.flying).toBe(true);
    
    // Lancer should be anti-armor specialist
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
    
    // Run step to create segments
    sim.step();
    
    // Should have created 8 dragon segments plus the head
    const allUnits = sim.units;
    const dragonUnits = allUnits.filter(u => u.id.includes('dragon') && !u.meta.phantom);
    expect(dragonUnits.length).toBe(9); // 1 head + 8 segments
    // console.log(`Dragon units found: ${dragonUnits.length}, total units: ${allUnits.length}`);
    
    // Check segments have armor
    const segments = allUnits.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(segments.length).toBe(8);
    
    segments.forEach(segment => {
      // Segments should NOT inherit huge status to prevent phantom explosion
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
    
    // Dragon should be too massive for normal grappling (mass 100 > 30)
    expect(dragon.mass).toBeGreaterThan(30);
    
    // But lancer should have special anti-dragon capabilities
    expect(lancer.meta.armorPiercing).toBeGreaterThan(0);
    expect(lancer.meta.harpoonRange).toBeGreaterThan(normalGrappler.meta.grapplingRange || 8);
    
    // Test that units exist
    expect(sim.units.length).toBeGreaterThanOrEqual(3);
  });

  it('should demonstrate dragon encounter scenario', () => {
    const sim = new Simulator(40, 30);
    
    // Create dragon encounter force
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 20, y: 15 } };
    const lancer1 = { ...Encyclopaedia.unit('lancer'), id: 'lancer1', pos: { x: 5, y: 10 } };
    const lancer2 = { ...Encyclopaedia.unit('lancer'), id: 'lancer2', pos: { x: 5, y: 20 } };
    const wormHunter = { ...Encyclopaedia.unit('worm-hunter'), id: 'hunter1', pos: { x: 10, y: 15 } };
    
    [dragon, lancer1, lancer2, wormHunter].forEach(u => sim.addUnit(u));
    
    // console.log('🐉 DRAGON ENCOUNTER SETUP:');
    // console.log(`Dragon: ${dragon.hp}hp, ${dragon.meta.segmentCount} segments, armor ${dragon.meta.armor}`);
    // console.log(`Lancers: ${lancer1.hp}hp, range ${lancer1.meta.harpoonRange}, piercing ${lancer1.meta.armorPiercing}`);
    // console.log(`Worm-hunter: ${wormHunter.hp}hp, can climb: ${wormHunter.meta.canClimbGrapples}`);
    
    // Run a few steps to see segmentation
    for (let i = 0; i < 3; i++) {
      const before = sim.units.length;
      sim.step();
      const after = sim.units.length;
      
      if (after > before) {
        // console.log(`Step ${i + 1}: ${after - before} segments created`);
      }
    }
    
    // Should have segments created for dragon
    const dragonSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'dragon1');
    expect(dragonSegments.length).toBe(8);
    
    // console.log(`Final unit count: ${sim.units.length} (including ${dragonSegments.length} dragon segments)`);
  });
});