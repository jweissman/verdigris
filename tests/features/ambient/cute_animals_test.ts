import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import { SceneLoader } from '../../../src/core/scene_loader';
import { AmbientBehavior } from '../../../src/rules/ambient_behavior';

describe('Cute Animals System', () => {
  it('should spawn cute animals in forest scenes', () => {
    const sim = new Simulator(20, 15);
    
    // Set forest biome
    (sim as any).sceneBackground = 'title-forest';
    
    // Run simulation to trigger spawning
    for (let tick = 0; tick < 200; tick++) {
      sim.step();
    }
    
    const finalAnimals = sim.units.filter(u => u.meta?.isAmbient);
    expect(finalAnimals.length).toBeGreaterThan(0);
    expect(finalAnimals.length).toBeLessThanOrEqual(10); // respects max limit
  });
  
  it('should make cute animals wander naturally', () => {
    const sim = new Simulator(15, 10);
    
    // Manually spawn a squirrel
    const squirrel = {
      id: 'test-squirrel',
      type: 'squirrel',
      sprite: 'squirrel',
      pos: { x: 7, y: 5 },
      hp: 8,
      maxHp: 8,
      team: 'neutral',
      meta: {
        isAmbient: true,
        spawnTick: 0,
        wanderTarget: { x: 10, y: 3 }
      }
    };
    
    sim.addUnit(squirrel);
    
    // Track movement over time
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
    
    // Verify movement occurred
    expect(positions.length).toBeGreaterThan(1);
    
    // Check that squirrel actually moved
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
    
    // Spawn two squirrels near each other
    const squirrel1 = {
      id: 'social-squirrel-1',
      type: 'squirrel',
      sprite: 'squirrel',
      pos: { x: 7, y: 5 },
      hp: 8,
      maxHp: 8,
      team: 'neutral',
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
      team: 'neutral',
      meta: {
        isAmbient: true,
        wanderTarget: { x: 4, y: 7 }
      }
    };
    
    sim.addUnit(squirrel1);
    sim.addUnit(squirrel2);
    
    // console.log('Initial positions:');
    // console.log(`  Squirrel 1: (${squirrel1.pos.x}, ${squirrel1.pos.y})`);
    // console.log(`  Squirrel 2: (${squirrel2.pos.x}, ${squirrel2.pos.y})`);
    
    // Run simulation and watch for social behaviors
    for (let tick = 0; tick < 100; tick++) {
      sim.step();
      
      if (tick % 25 === 0) {
        const s1 = sim.units.find(u => u.id === 'social-squirrel-1');
        const s2 = sim.units.find(u => u.id === 'social-squirrel-2');
        
        if (s1 && s2) {
          const distance = Math.sqrt(
            Math.pow(s1.pos.x - s2.pos.x, 2) + Math.pow(s1.pos.y - s2.pos.y, 2)
          );
          
          // console.log(`\nTick ${tick}:`);
          // console.log(`  Distance between squirrels: ${distance.toFixed(2)}`);
          // console.log(`  S1: (${s1.pos.x.toFixed(1)}, ${s1.pos.y.toFixed(1)}) → (${s1.meta.wanderTarget.x.toFixed(1)}, ${s1.meta.wanderTarget.y.toFixed(1)})`);
          // console.log(`  S2: (${s2.pos.x.toFixed(1)}, ${s2.pos.y.toFixed(1)}) → (${s2.meta.wanderTarget.x.toFixed(1)}, ${s2.meta.wanderTarget.y.toFixed(1)})`);
        }
      }
    }
    
    expect(sim.units.filter(u => u.meta?.isAmbient).length).toBe(2);
  });
  
  it('should integrate with title screen scene', () => {
    // console.log('\n🎬 TITLE SCREEN INTEGRATION TEST');
    
    const sim = new Simulator(40, 20);
    const sceneLoader = new SceneLoader(sim);
    
    // Load title background scene
    sceneLoader.loadScenario('titleBackground');
    
    
    // Run for a while to see ambient spawning + existing creatures
    for (let tick = 0; tick < 300; tick++) {
      sim.step();
      
      if (tick % 100 === 0) {
        const ambientCount = sim.units.filter(u => u.meta?.isAmbient).length;
        const totalCount = sim.units.length;
        // console.log(`\nTick ${tick}: ${totalCount} total units (${ambientCount} ambient spawned)`);
        
        // Show some creature positions
        const creatures = sim.units.slice(0, 5);
        creatures.forEach(creature => {
          // console.log(`  ${creature.id}: (${creature.pos.x.toFixed(1)}, ${creature.pos.y.toFixed(1)})`);
        });
      }
    }
    
    const finalWoodlandCreatures = sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'bird', 'deer'].includes(u.type) && u.hp > 0
    );
    const initialWoodlandCount = 21; // from scene
    
    expect(sim.units.length).toBeGreaterThan(0);
    expect(finalWoodlandCreatures.length).toBeGreaterThan(10); // Should have plenty of woodland creatures
  });
});