import { describe, it, expect } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';

describe('Performance Tests', () => {
  const scenarios = ['simple', 'complex', 'healing', 'projectile', 'squirrel'];
  const SIMULATION_STEPS = 1500;
  const EXECUTION_TIME_PER_STEP = 0.1;
  const MAX_EXECUTION_TIME = SIMULATION_STEPS * EXECUTION_TIME_PER_STEP + 10;

  scenarios.forEach(scenario => {
    describe.skip(scenario, () => {
      it(`${scenario} run ${SIMULATION_STEPS} ticks by ${MAX_EXECUTION_TIME}ms`, () => {
        const sim = new Simulator(32, 32);
        const loader = new SceneLoader(sim);
        const startTime = performance.now();
        loader.loadScenario(scenario);
        for (let step = 0; step < SIMULATION_STEPS; step++) {
          sim.step();
          const currentUnits = sim.getRealUnits().length;
          expect(currentUnits).toBeLessThan(100); // Sanity check - no unit explosion
        }
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        expect(executionTime).toBeLessThan(MAX_EXECUTION_TIME);
        const outOfBoundsX = sim.units.filter(u => u.pos.x < 0 || u.pos.x >= sim.fieldWidth);
        const outOfBoundsY = sim.units.filter(u => u.pos.y < 0 || u.pos.y >= sim.fieldHeight);
      
        if (outOfBoundsX.length > 0) {
          console.debug(`Units out of bounds X (field width=${sim.fieldWidth}):`,
            outOfBoundsX.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
        if (outOfBoundsY.length > 0) {
          console.debug(`Units out of bounds Y (field height=${sim.fieldHeight}):`,
            outOfBoundsY.map(u => ({ id: u.id, x: u.pos.x, y: u.pos.y })));
        }
      
        expect(sim.units.every(u => u.pos.x >= 0 && u.pos.x < sim.fieldWidth)).toBe(true);
        expect(sim.units.every(u => u.pos.y >= 0 && u.pos.y < sim.fieldHeight)).toBe(true);
      });
    });
  });

  it('should handle stress test with multiple megasquirrels', () => {
    const sim = new Simulator(20, 20);
    for (let i = 0; i < 3; i++) {
      sim.addUnit({
        id: `mega${i}`,
        pos: { x: 5 + i * 5, y: 5 },
        intendedMove: { x: 0, y: 0 },
        team: 'friendly',
        sprite: 'megasquirrel',
        state: 'idle',
        hp: 40,
        maxHp: 40,
        mass: 8,
        abilities: ['jumps'],
        meta: { huge: true }
      });
    }
    for (let i = 0; i < 10; i++) {
      sim.addUnit({
        id: `worm${i}`,
        pos: { x: 10 + (i % 5) * 2, y: 10 + Math.floor(i / 5) * 2 },
        intendedMove: { x: 0, y: 0 },
        team: 'hostile',
        sprite: 'worm',
        state: 'idle',
        hp: 10,
        maxHp: 10,
        mass: 1,
        abilities: [],
        meta: {}
      });
    }
    
    const startTime = performance.now();

    const steps = 30;
    for (let step = 0; step < steps; step++) {
      sim.step();
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // expect(executionTime).toBeLessThan(1500);
    expect(executionTime).toBeLessThan(steps * EXECUTION_TIME_PER_STEP);
  });

  it('should measure actual step time without overhead', () => {
    const sim = new Simulator(32, 32);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    const times: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const median = times.sort((a, b) => a - b)[50];
    
    console.debug('\n=== Raw Performance Stats (50 units, 100 steps) ===');
    console.debug(`Average: ${avgTime.toFixed(3)}ms`);
    console.debug(`Median: ${median.toFixed(3)}ms`);
    console.debug(`Min: ${minTime.toFixed(3)}ms`);
    console.debug(`Max: ${maxTime.toFixed(3)}ms`);
    console.debug(`FPS at avg: ${(1000 / avgTime).toFixed(0)} fps (sim only)`);
    

    for (let i = 50; i < 200; i++) {
      sim.addUnit({
        id: `unit${i}`,
        pos: { x: Math.random() * 32, y: Math.random() * 32 },
        intendedMove: { x: Math.random() - 0.5, y: Math.random() - 0.5 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        maxHp: 20,
        mass: 1
      });
    }
    
    const times200: number[] = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      const elapsed = performance.now() - start;
      times200.push(elapsed);
    }
    
    const avgTime200 = times200.reduce((a, b) => a + b, 0) / times200.length;
    const median200 = times200.sort((a, b) => a - b)[50];
    
    console.debug('\n=== With 200 units ===');
    console.debug(`Average: ${avgTime200.toFixed(3)}ms`);
    console.debug(`Median: ${median200.toFixed(3)}ms`);
    console.debug(`FPS at avg: ${(1000 / avgTime200).toFixed(0)} fps (sim only)`);
    

    const scalingFactor = avgTime200 / avgTime;
    console.debug(`\nScaling: ${scalingFactor.toFixed(2)}x slower with 4x units`);
    if (scalingFactor > 10) {
      console.debug('❌ O(n²) scaling detected!');
    } else if (scalingFactor > 4) {
      console.debug('⚠️ Worse than linear scaling');
    } else {
      console.debug('✅ Near-linear scaling');
    }
  });





    


    



    

    







      




    








    

    



    





      









      




      





    





    






    








    






    





















    

    




    





    









    






    


      





















      

      




      



      


    




    
















    






    

});