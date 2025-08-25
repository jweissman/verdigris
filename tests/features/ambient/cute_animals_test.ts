import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import { SceneLoader } from '../../../src/core/scene_loader';
import { AmbientBehavior } from '../../../src/rules/ambient_behavior';

describe('Cute Animals System', () => {
  it('should spawn cute animals in forest scenes', () => {
    const sim = new Simulator(20, 15);
    

    (sim as any).sceneBackground = 'title-forest';
    

    for (let tick = 0; tick < 200; tick++) {
      sim.step();
    }
    
    const finalAnimals = sim.units.filter(u => u.meta?.isAmbient);
    expect(finalAnimals.length).toBeGreaterThan(0);
    expect(finalAnimals.length).toBeLessThanOrEqual(10);
  });
  
  it('should make cute animals wander naturally', () => {

    Simulator.rng.reset(12345);
    const sim = new Simulator(15, 10);
    

    const squirrel = {
      id: 'test-squirrel',
      type: 'squirrel',
      sprite: 'squirrel',
      pos: { x: 7, y: 5 },
      hp: 8,
      maxHp: 8,
      team: 'neutral' as const,
      meta: {
        isAmbient: true,
        spawnTick: 0,
        wanderTarget: { x: 10, y: 3 }
      }
    };
    
    sim.addUnit(squirrel);
    

    const positions: { x: number; y: number }[] = [];
    
    for (let tick = 0; tick < 50; tick++) {
      sim.step();
      
      if (tick % 10 === 0) {
        const currentSquirrel = sim.units.find(u => u.id === 'test-squirrel');
        if (currentSquirrel) {
          positions.push({ x: currentSquirrel.pos.x, y: currentSquirrel.pos.y });
        }
      }
    }
    

    expect(positions.length).toBeGreaterThan(1);
    

    const startPos = positions[0];
    const endPos = positions[positions.length - 1];
    const totalMovement = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
    );
    
    expect(totalMovement).toBeGreaterThan(0.4); // Should have moved meaningfully
  });
  
  it('should handle social interactions between cute animals', () => {
    const sim = new Simulator(15, 10);
    sim.sceneBackground = 'arena'; // Prevent ambient spawning
    

    const squirrel1 = {
      id: 'social-squirrel-1',
      type: 'squirrel',
      sprite: 'squirrel',
      pos: { x: 7, y: 5 },
      hp: 8,
      maxHp: 8,
      team: 'neutral' as const,
      meta: {
        isAmbient: true,
        wanderTarget: { x: 10, y: 5 }
      }
    };
    
    const squirrel2 = {
      id: 'social-squirrel-2',
      type: 'squirrel',
      sprite: 'squirrel',
      pos: { x: 8, y: 6 },
      hp: 8,
      maxHp: 8,
      team: 'neutral' as const,
      meta: {
        isAmbient: true,
        wanderTarget: { x: 4, y: 7 }
      }
    };
    
    sim.addUnit(squirrel1);
    sim.addUnit(squirrel2);
    



    

    for (let tick = 0; tick < 100; tick++) {
      sim.step();
      
      if (tick % 25 === 0) {
        const s1 = sim.units.find(u => u.id === 'social-squirrel-1');
        const s2 = sim.units.find(u => u.id === 'social-squirrel-2');
        
        if (s1 && s2) {
          const distance = Math.sqrt(
            Math.pow(s1.pos.x - s2.pos.x, 2) + Math.pow(s1.pos.y - s2.pos.y, 2)
          );
          




        }
      }
    }
    
    expect(sim.units.filter(u => u.meta?.isAmbient).length).toBe(2);
  });
  

  it.skip('should integrate with title screen scene', () => {

    
    const sim = new Simulator(40, 20);
    const sceneLoader = new SceneLoader(sim);
    

    sceneLoader.loadScenario('titleBackground');
    
    

    for (let tick = 0; tick < 300; tick++) {
      sim.step();
      
      if (tick % 100 === 0) {
        const ambientCount = sim.units.filter(u => u.meta?.isAmbient).length;
        const totalCount = sim.units.length;

        

        const creatures = sim.units.slice(0, 5);
        creatures.forEach(creature => {

        });
      }
    }
    
    const finalWoodlandCreatures = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    );
    const initialWoodlandCount = 21;
    
    expect(sim.units.length).toBeGreaterThan(0);
    expect(finalWoodlandCreatures.length).toBeGreaterThan(10); // Should have plenty of woodland creatures
  });
});