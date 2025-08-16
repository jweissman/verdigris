import { describe, test } from 'bun:test';

describe('Proxy Overhead Analysis', () => {
  test('measure different access patterns', () => {
    const count = 1000;
    const iterations = 10000;
    

    const posX = new Float32Array(count);
    const posY = new Float32Array(count);
    const ids = new Array(count);
    
    for (let i = 0; i < count; i++) {
      posX[i] = Math.random() * 100;
      posY[i] = Math.random() * 100;
      ids[i] = `unit_${i}`;
    }
    

    {
      const start = performance.now();
      let sum = 0;
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
          sum += posX[i] + posY[i];
        }
      }
      const time = performance.now() - start;
      console.log(`Direct array access: ${time.toFixed(2)}ms (${(time/iterations).toFixed(4)}ms per iter)`);
    }
    

    {
      const units = [];
      for (let i = 0; i < count; i++) {
        const index = i;
        units.push({
          get x() { return posX[index]; },
          get y() { return posY[index]; }
        });
      }
      
      const start = performance.now();
      let sum = 0;
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
          sum += units[i].x + units[i].y;
        }
      }
      const time = performance.now() - start;
      console.log(`Object with getters: ${time.toFixed(2)}ms (${(time/iterations).toFixed(4)}ms per iter)`);
    }
    

    {
      const start = performance.now();
      let sum = 0;
      for (let iter = 0; iter < iterations; iter++) {

        const units = [];
        for (let i = 0; i < count; i++) {
          const index = i;
          units.push({
            get x() { return posX[index]; },
            get y() { return posY[index]; }
          });
        }
        
        for (let i = 0; i < count; i++) {
          sum += units[i].x + units[i].y;
        }
      }
      const time = performance.now() - start;
      console.log(`Creating proxies each iteration: ${time.toFixed(2)}ms (${(time/iterations).toFixed(4)}ms per iter)`);
    }
    

    {
      const start = performance.now();
      for (let iter = 0; iter < iterations; iter++) {
        const units = new Array(count);
        for (let i = 0; i < count; i++) {
          units[i] = i;
        }
      }
      const time = performance.now() - start;
      console.log(`Just array allocation: ${time.toFixed(2)}ms (${(time/iterations).toFixed(4)}ms per iter)`);
    }
    

    {
      const units = [];
      for (let i = 0; i < count; i++) {
        units.push({ x: posX[i], y: posY[i] });
      }
      
      const start1 = performance.now();
      let sum1 = 0;
      for (let iter = 0; iter < iterations; iter++) {
        units.forEach(u => {
          sum1 += u.x + u.y;
        });
      }
      const time1 = performance.now() - start1;
      
      const start2 = performance.now();
      let sum2 = 0;
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < count; i++) {
          sum2 += units[i].x + units[i].y;
        }
      }
      const time2 = performance.now() - start2;
      
      console.log(`forEach: ${time1.toFixed(2)}ms vs for loop: ${time2.toFixed(2)}ms`);
    }
  });
});