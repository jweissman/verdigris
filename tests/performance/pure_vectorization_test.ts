import { describe, test } from 'bun:test';

describe('Pure Vectorization Performance', () => {
  test('raw typed array performance', () => {
    const count = 1000;
    const posX = new Float32Array(count);
    const posY = new Float32Array(count);
    const velX = new Float32Array(count);
    const velY = new Float32Array(count);
    

    for (let i = 0; i < count; i++) {
      posX[i] = Math.random() * 100;
      posY[i] = Math.random() * 100;
      velX[i] = (Math.random() - 0.5) * 2;
      velY[i] = (Math.random() - 0.5) * 2;
    }
    

    const iterations = 10000;
    const start = performance.now();
    
    for (let iter = 0; iter < iterations; iter++) {

      for (let i = 0; i < count; i++) {
        posX[i] += velX[i];
        posY[i] += velY[i];
      }
    }
    
    const end = performance.now();
    const totalTime = end - start;
    const timePerIteration = totalTime / iterations;
    const timePerUnit = timePerIteration / count;
    
    console.log(`\n=== Pure Vectorization Performance ===`);
    console.log(`${count} units, ${iterations} iterations`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Time per iteration: ${timePerIteration.toFixed(4)}ms`);
    console.log(`Time per unit per iteration: ${(timePerUnit * 1000).toFixed(3)}ns`);
    console.log(`\nFor 50 units: ${(timePerIteration * 50 / count).toFixed(4)}ms`);
    console.log(`For 200 units: ${(timePerIteration * 200 / count).toFixed(4)}ms`);
  });
  
  test('compare with object iteration', () => {
    const count = 1000;
    const units = [];
    

    for (let i = 0; i < count; i++) {
      units.push({
        pos: { x: Math.random() * 100, y: Math.random() * 100 },
        vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
      });
    }
    
    const iterations = 10000;
    const start = performance.now();
    
    for (let iter = 0; iter < iterations; iter++) {

      for (let i = 0; i < count; i++) {
        units[i].pos.x += units[i].vel.x;
        units[i].pos.y += units[i].vel.y;
      }
    }
    
    const end = performance.now();
    const totalTime = end - start;
    const timePerIteration = totalTime / iterations;
    
    console.log(`\n=== Object-based Performance ===`);
    console.log(`${count} units, ${iterations} iterations`);
    console.log(`Time per iteration: ${timePerIteration.toFixed(4)}ms`);
    console.log(`\nFor 50 units: ${(timePerIteration * 50 / count).toFixed(4)}ms`);
    console.log(`For 200 units: ${(timePerIteration * 200 / count).toFixed(4)}ms`);
  });
});