import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Proxy Overhead Measurement', () => {
  test('Measure proxy creation overhead', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    

    const iterations = 10000;
    

    for (let i = 0; i < 100; i++) {
      context.getAllUnits();
    }
    

    const getAllUnitsStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const units = context.getAllUnits();
    }
    const getAllUnitsTime = (performance.now() - getAllUnitsStart) / iterations;
    

    const arrays = (context as any).getArrays();
    const arrayAccessStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      for (const idx of arrays.activeIndices) {
        const x = arrays.posX[idx];
        const y = arrays.posY[idx];
        const hp = arrays.hp[idx];
      }
    }
    const arrayAccessTime = (performance.now() - arrayAccessStart) / iterations;
    

    const objectCreationStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const objs = [];
      for (let j = 0; j < 50; j++) {
        objs.push({
          id: `unit_${j}`,
          pos: { x: j, y: j },
          hp: 20,
          maxHp: 20,
          team: 'friendly',
          state: 'idle'
        });
      }
    }
    const objectCreationTime = (performance.now() - objectCreationStart) / iterations;
    
    console.log('\n=== Proxy Creation Overhead ===');
    console.log(`getAllUnits() (50 units):     ${getAllUnitsTime.toFixed(4)}ms`);
    console.log(`Direct array access:           ${arrayAccessTime.toFixed(4)}ms`);
    console.log(`Plain object creation:         ${objectCreationTime.toFixed(4)}ms`);
    console.log(`Overhead vs arrays:            ${(getAllUnitsTime / arrayAccessTime).toFixed(1)}x`);
    console.log(`Overhead vs plain objects:     ${(getAllUnitsTime / objectCreationTime).toFixed(1)}x`);
    


    const proxyTimePerFrame = getAllUnitsTime * 19;
    console.log(`\nProxy creation per frame:      ${proxyTimePerFrame.toFixed(4)}ms`);
    console.log(`As % of 0.1ms budget:          ${(proxyTimePerFrame / 0.1 * 100).toFixed(0)}%`);
    
    expect(getAllUnitsTime).toBeLessThan(0.01);
  });
});