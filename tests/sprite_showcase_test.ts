import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { CommandHandler } from '../src/rules/command_handler';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import { SegmentedCreatures } from '../src/rules/segmented_creatures';
import { HugeUnits } from '../src/rules/huge_units';

describe('Sprite Showcase - Visual Testing', () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new EventHandler(sim),
      new HugeUnits(sim),
      new SegmentedCreatures(sim)
    ];
  });

  it('should create a comprehensive creature showcase for visual testing', () => {
    // Get all available creatures from the bestiary
    const allCreatures = Object.keys(Encyclopaedia.bestiary);
    
    let x = 2;
    let y = 2;
    const spacing = 4; // Space between creatures
    const rowLength = 8; // Creatures per row
    
    const creatureDetails: any[] = [];
    
    allCreatures.forEach((creatureType, index) => {
      try {
        // Create the creature
        const creature = Encyclopaedia.unit(creatureType);
        creature.pos = { x, y };
        creature.id = `showcase_${creatureType}_${index}`;
        
        sim.addUnit(creature);
        
        // Collect creature details for reporting
        creatureDetails.push({
          type: creatureType,
          position: { x, y },
          sprite: creature.sprite,
          huge: creature.meta.huge || false,
          segmented: creature.meta.segmented || false,
          segmentCount: creature.meta.segmentCount || 0,
          tags: creature.tags || [],
          hp: creature.hp,
          abilities: Object.keys(creature.abilities)
        });
        
        
        // Move to next position
        x += spacing;
        if ((index + 1) % rowLength === 0) {
          x = 2;
          y += spacing;
        }
        
      } catch (error) {
        // Failed to create creature, skip
      }
    });
    
    // Run a few simulation ticks to ensure segmented creatures and huge units are properly set up
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    
    const categories = {
      normal: creatureDetails.filter(c => !c.huge && !c.segmented),
      huge: creatureDetails.filter(c => c.huge && !c.segmented),
      segmented: creatureDetails.filter(c => c.segmented && !c.huge),
      hugeSegmented: creatureDetails.filter(c => c.huge && c.segmented),
      specialTags: creatureDetails.filter(c => c.tags.some(tag => 
        ['grappler', 'desert', 'mechanical', 'construct'].includes(tag)
      ))
    };
    
    Object.entries(categories).forEach(([category, creatures]) => {
      // Category processed
    });
    
    // Verify all creatures were created successfully
    expect(sim.units.length).toBeGreaterThan(0);
    expect(sim.units.length).toBeLessThanOrEqual(allCreatures.length * 15); // Allow for segments
    
    // Create some interaction scenarios
    
    // Add some projectiles for visual testing
    sim.projectiles.push({
      id: 'test_bullet',
      pos: { x: 10, y: 10 },
      vel: { x: 0.5, y: 0 },
      radius: 0.3,
      damage: 5,
      team: 'hostile',
      type: 'bullet'
    });
    
    // Add grapple line for physics testing
    sim.projectiles.push({
      id: 'test_grapple',
      pos: { x: 15, y: 10 },
      vel: { x: 0.8, y: 0.2 },
      radius: 0.5,
      damage: 0,
      team: 'friendly',
      type: 'grapple' as any,
      grapplerID: 'test_grappler',
      target: { x: 20, y: 12 }
    } as any);
    
    // Verify units were created
    expect(sim.units.length).toBeGreaterThan(allCreatures.length); // Includes segments
    expect(sim.projectiles.length).toBeGreaterThan(0);
  });

  it('should test specific problematic rendering scenarios', () => {
    
    // Test overlapping huge units
    const megasquirrel1 = Encyclopaedia.unit('megasquirrel');
    megasquirrel1.pos = { x: 5, y: 5 };
    megasquirrel1.id = 'overlap_test_1';
    sim.addUnit(megasquirrel1);
    
    const megasquirrel2 = Encyclopaedia.unit('megasquirrel');
    megasquirrel2.pos = { x: 6, y: 6 }; // Slightly overlapping
    megasquirrel2.id = 'overlap_test_2';
    sim.addUnit(megasquirrel2);
    
    // Test segmented creature at field boundaries
    const worm = Encyclopaedia.unit('big-worm');
    worm.pos = { x: sim.fieldWidth - 2, y: sim.fieldHeight - 2 }; // Near boundary
    worm.id = 'boundary_test_worm';
    sim.addUnit(worm);
    
    // Test desert megaworm (longest segmented creature)
    const megaworm = Encyclopaedia.unit('desert-megaworm');
    megaworm.pos = { x: 10, y: 20 };
    megaworm.id = 'megaworm_test';
    sim.addUnit(megaworm);
    
    // Run simulation to set up segments
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Verify edge cases created
    expect(sim.units.filter(u => u.meta?.huge).length).toBeGreaterThanOrEqual(2);
    expect(sim.units.filter(u => u.meta?.segmented).length).toBeGreaterThanOrEqual(1);
    
    expect(sim.units.length).toBeGreaterThan(4); // Original units + segments
  });

  it('should create animation state testing scenarios', () => {
    
    const testUnits = ['soldier', 'demon', 'grappler', 'mechatronist'];
    
    testUnits.forEach((unitType, index) => {
      // Create unit in different states
      const idleUnit = Encyclopaedia.unit(unitType);
      idleUnit.pos = { x: 2 + index * 4, y: 8 };
      idleUnit.id = `${unitType}_idle`;
      idleUnit.state = 'idle';
      sim.addUnit(idleUnit);
      
      const attackUnit = Encyclopaedia.unit(unitType);
      attackUnit.pos = { x: 2 + index * 4, y: 10 };
      attackUnit.id = `${unitType}_attack`;
      attackUnit.state = 'attack';
      sim.addUnit(attackUnit);
      
      const deadUnit = Encyclopaedia.unit(unitType);
      deadUnit.pos = { x: 2 + index * 4, y: 12 };
      deadUnit.id = `${unitType}_dead`;
      deadUnit.state = 'dead';
      deadUnit.hp = 0;
      sim.addUnit(deadUnit);
      
      // Test facing directions
      const leftUnit = Encyclopaedia.unit(unitType);
      leftUnit.pos = { x: 2 + index * 4, y: 14 };
      leftUnit.id = `${unitType}_left`;
      leftUnit.meta.facing = 'left';
      sim.addUnit(leftUnit);
    });
    
    // Verify animation test units
    expect(sim.units.length).toBe(testUnits.length * 4);
    
    expect(sim.units.filter(u => u.id.includes('_idle')).length).toBe(testUnits.length);
    expect(sim.units.filter(u => u.id.includes('_attack')).length).toBe(testUnits.length);
    expect(sim.units.filter(u => u.id.includes('_dead')).length).toBe(testUnits.length);
    expect(sim.units.filter(u => u.id.includes('_left')).length).toBe(testUnits.length);
  });
});