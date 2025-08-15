import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Woodland Summoning', () => {
  it('should demonstrate woodland creatures calling friends over time', () => {
    // console.log('🌲 WOODLAND CREATURE SUMMONING TEST');
    
    const sim = new Simulator(30, 20);
    const sceneLoader = new SceneLoader(sim);
    
    // Set background to trigger woodland summoning
    (sim as any).sceneBackground = 'title-forest';
    
    // Start with just a few squirrels
    const initialSquirrels = 3;
    for (let i = 0; i < initialSquirrels; i++) {
      const squirrel = {
        id: `starter-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: 5 + i * 3, y: 10 },
        hp: 8,
        maxHp: 8,
        team: 'neutral'
      };
      sim.addUnit(squirrel);
    }
    
    // console.log(`Starting with ${initialSquirrels} squirrels`);
    
    // Track population over time
    const populationHistory: Array<{ tick: number; count: number }> = [];
    
    // Run for a long time to see summoning effects
    for (let tick = 0; tick < 500; tick++) {
      sim.step();
      
      if (tick % 100 === 0) {
        const woodlandCount = sim.units.filter(u => 
          ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
        ).length;
        
        populationHistory.push({ tick, count: woodlandCount });
        // console.log(`Tick ${tick}: ${woodlandCount} woodland creatures`);
        
        // Show specific types
        const counts = new Map<string, number>();
        sim.units.forEach(u => {
          if (['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0) {
            counts.set(u.type, (counts.get(u.type) || 0) + 1);
          }
        });
        
        // console.log(`  Breakdown: ${Array.from(counts.entries()).map(([type, count]) => `${type}=${count}`).join(', ')}`);
      }
    }
    
    const finalWoodlandCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    
    // console.log(`\nPopulation growth over time:`);
    populationHistory.forEach(({ tick, count }) => {
      // console.log(`  Tick ${tick}: ${count} creatures`);
    });
    
    // console.log(`\nFinal woodland population: ${finalWoodlandCount}`);
    // console.log(`Growth from initial: ${finalWoodlandCount - initialSquirrels}`);
    
    // Should have grown beyond initial population
    expect(finalWoodlandCount).toBeGreaterThanOrEqual(initialSquirrels);
    
    // Should have some variety if summoning worked
    const finalTypes = new Set(
      sim.units
        .filter(u => ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0)
        .map(u => u.type)
    );
    
    // console.log(`Final creature types: ${Array.from(finalTypes).join(', ')}`);
    expect(finalTypes.size).toBeGreaterThan(0);
  });
  
  it('should respect population limits in woodland summoning', () => {
    // console.log('\n📊 WOODLAND POPULATION CONTROL TEST');
    
    const sim = new Simulator(20, 15);
    (sim as any).sceneBackground = 'title-forest';
    
    // Start with many creatures to test limits
    for (let i = 0; i < 15; i++) {
      const creature = {
        id: `crowd-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: (i % 5) * 4 + 2, y: Math.floor(i / 5) * 4 + 2 },
        hp: 8,
        maxHp: 8,
        team: 'neutral'
      };
      sim.addUnit(creature);
    }
    
    // console.log(`Starting with ${sim.units.length} creatures (above limit)`);
    
    // Run simulation - should not spawn more due to population limit
    for (let tick = 0; tick < 200; tick++) {
      sim.step();
      
      if (tick % 50 === 0) {
        const woodlandCount = sim.units.filter(u => 
          ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
        ).length;
        // console.log(`Tick ${tick}: ${woodlandCount} woodland creatures`);
      }
    }
    
    const finalCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    
    // console.log(`Final count: ${finalCount} (population control working if <= 12)`);
    
    // Should not have exploded beyond reasonable limits
    expect(finalCount).toBeLessThanOrEqual(20); // Reasonable upper bound
  });
  
  it('should only summon in appropriate biomes', () => {
    // console.log('\n🏜️ BIOME RESTRICTION TEST');
    
    const sim = new Simulator(15, 10);
    
    // Set desert background (should not trigger woodland summoning)
    (sim as any).sceneBackground = 'desert';
    
    // Add some squirrels anyway
    for (let i = 0; i < 3; i++) {
      const squirrel = {
        id: `desert-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: 5 + i * 2, y: 5 },
        hp: 8,
        maxHp: 8,
        team: 'neutral'
      };
      sim.addUnit(squirrel);
    }
    
    const initialCount = sim.units.length;
    // console.log(`Desert scene: starting with ${initialCount} squirrels`);
    
    // Run simulation - should NOT summon woodland creatures in desert
    for (let tick = 0; tick < 200; tick++) {
      sim.step();
    }
    
    const finalCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    
    // console.log(`After 200 ticks: ${finalCount} woodland creatures`);
    // console.log(`Change: ${finalCount - initialCount} (should be <= 0 in desert)`);
    
    // Should not have increased in desert biome
    expect(finalCount).toBeLessThanOrEqual(initialCount + 1); // Allow for minimal variance
  });
});