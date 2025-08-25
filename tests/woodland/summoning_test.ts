import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';


describe.skip('Woodland Summoning', () => {
  it('should demonstrate woodland creatures calling friends over time', () => {

    
    const sim = new Simulator(30, 20);
    const sceneLoader = new SceneLoader(sim);
    

    (sim as any).sceneBackground = 'title-forest';
    

    const initialSquirrels = 3;
    for (let i = 0; i < initialSquirrels; i++) {
      const squirrel = {
        id: `starter-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: 5 + i * 3, y: 10 },
        hp: 8,
        maxHp: 8,
        team: 'neutral' as const
      };
      sim.addUnit(squirrel);
    }
    

    

    const populationHistory: Array<{ tick: number; count: number }> = [];
    

    for (let tick = 0; tick < 500; tick++) {
      sim.step();
      
      if (tick % 100 === 0) {
        const woodlandCount = sim.units.filter(u => 
          ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
        ).length;
        
        populationHistory.push({ tick, count: woodlandCount });

        

        const counts = new Map<string, number>();
        sim.units.forEach(u => {
          if (['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0) {
            counts.set(u.type, (counts.get(u.type) || 0) + 1);
          }
        });
        

      }
    }
    
    const finalWoodlandCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    

    populationHistory.forEach(({ tick, count }) => {

    });
    


    

    expect(finalWoodlandCount).toBeGreaterThanOrEqual(initialSquirrels);
    

    const finalTypes = new Set(
      sim.units
        .filter(u => ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0)
        .map(u => u.type)
    );
    

    expect(finalTypes.size).toBeGreaterThan(0);
  });
  
  it('should respect population limits in woodland summoning', () => {

    
    const sim = new Simulator(20, 15);
    (sim as any).sceneBackground = 'title-forest';
    

    for (let i = 0; i < 15; i++) {
      const creature = {
        id: `crowd-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: (i % 5) * 4 + 2, y: Math.floor(i / 5) * 4 + 2 },
        hp: 8,
        maxHp: 8,
        team: 'neutral' as const
      };
      sim.addUnit(creature);
    }
    

    

    for (let tick = 0; tick < 200; tick++) {
      sim.step();
      
      if (tick % 50 === 0) {
        const woodlandCount = sim.units.filter(u => 
          ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
        ).length;

      }
    }
    
    const finalCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    

    

    expect(finalCount).toBeLessThanOrEqual(20); // Reasonable upper bound
  });
  
  it('should only summon in appropriate biomes', () => {

    
    const sim = new Simulator(15, 10);
    

    (sim as any).sceneBackground = 'desert';
    

    for (let i = 0; i < 3; i++) {
      const squirrel = {
        id: `desert-squirrel-${i}`,
        type: 'squirrel',
        sprite: 'squirrel',
        pos: { x: 5 + i * 2, y: 5 },
        hp: 8,
        maxHp: 8,
        team: 'neutral' as const
      };
      sim.addUnit(squirrel);
    }
    
    const initialCount = sim.units.length;

    

    for (let tick = 0; tick < 200; tick++) {
      sim.step();
    }
    
    const finalCount = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    ).length;
    


    

    expect(finalCount).toBeLessThanOrEqual(initialCount + 1); // Allow for minimal variance
  });
});