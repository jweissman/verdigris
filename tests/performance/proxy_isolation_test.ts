import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Proxy Overhead Isolation', () => {
  test('Measure exact proxy overhead', () => {
    const sim = new Simulator(50, 50);
    
    // Add 100 units
    for (let i = 0; i < 100; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 20
      });
    }
    
    const iterations = 10000;
    const arrays = sim.unitArrays;
    const proxyManager = sim.proxyManager;
    
    // Test 1: Direct array access
    const directStart = performance.now();
    let sum1 = 0;
    for (let iter = 0; iter < iterations; iter++) {
      for (const i of arrays.activeIndices) {
        sum1 += arrays.posX[i] + arrays.posY[i] + arrays.hp[i];
      }
    }
    const directTime = performance.now() - directStart;
    
    // Test 2: Proxy access (cached proxies)
    const proxies = proxyManager.getAllProxies(); // Get cached proxies once
    const proxyStart = performance.now();
    let sum2 = 0;
    for (let iter = 0; iter < iterations; iter++) {
      for (const proxy of proxies) {
        sum2 += proxy.pos.x + proxy.pos.y + proxy.hp;
      }
    }
    const proxyTime = performance.now() - proxyStart;
    
    // Test 3: Creating proxies every iteration
    const createStart = performance.now();
    let sum3 = 0;
    for (let iter = 0; iter < iterations; iter++) {
      const freshProxies = proxyManager.getAllProxies();
      for (const proxy of freshProxies) {
        sum3 += proxy.pos.x + proxy.pos.y + proxy.hp;
      }
    }
    const createTime = performance.now() - createStart;
    
    const proxyOverhead = proxyTime / directTime;
    const createOverhead = createTime / directTime;
    
    console.log('\n=== Proxy Overhead Analysis (100 units, 10k iterations) ===');
    console.log(`Direct array access:     ${directTime.toFixed(2)}ms`);
    console.log(`Cached proxy access:     ${proxyTime.toFixed(2)}ms (${proxyOverhead.toFixed(1)}x slower)`);
    console.log(`Fresh proxy creation:    ${createTime.toFixed(2)}ms (${createOverhead.toFixed(1)}x slower)`);
    console.log(`\nPer-iteration times:`);
    console.log(`Direct:  ${(directTime / iterations).toFixed(4)}ms`);
    console.log(`Proxy:   ${(proxyTime / iterations).toFixed(4)}ms`);
    console.log(`Create:  ${(createTime / iterations).toFixed(4)}ms`);
    
    // Verify correctness
    expect(sum1).toBeGreaterThan(0);
    expect(sum2).toBe(sum1);
    expect(sum3).toBe(sum1);
  });
  
  test('Profile actual rule execution', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units with abilities to trigger rule logic
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20,
        abilities: ['melee']
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const iterations = 100;
    const ruleTimes = new Map<string, number>();
    
    for (let iter = 0; iter < iterations; iter++) {
      const context = sim.getTickContext();
      
      for (const rule of sim.rulebook) {
        const ruleName = rule.constructor.name;
        const start = performance.now();
        rule.execute(context);
        const time = performance.now() - start;
        
        ruleTimes.set(ruleName, (ruleTimes.get(ruleName) || 0) + time);
      }
    }
    
    console.log('\n=== Individual Rule Times (50 units, 100 iterations) ===');
    const sorted = Array.from(ruleTimes.entries()).sort((a, b) => b[1] - a[1]);
    let total = 0;
    for (const [name, time] of sorted) {
      const avg = time / iterations;
      total += avg;
      console.log(`${name.padEnd(20)} ${avg.toFixed(4)}ms`);
    }
    console.log(`TOTAL:               ${total.toFixed(4)}ms`);
  });
});