import { describe, it, expect } from 'bun:test';
import { UnitArrays } from '../../src/sim/unit_arrays';
import { UnitProxyManager } from '../../src/sim/unit_proxy';

describe('Struct-of-Arrays Performance', () => {
  it('should demonstrate SoA performance benefits for collision detection', () => {
    const NUM_UNITS = 500;
    const arrays = new UnitArrays(NUM_UNITS);
    
    // Create units
    for (let i = 0; i < NUM_UNITS; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const team = i % 2; // alternating teams
      arrays.add(`unit${i}`, x, y, 20, 20, team);
    }
    
    // Test 1: Collision detection performance
    const startCollision = performance.now();
    let collisionCount = 0;
    
    arrays.processCollisions((i, j, dist) => {
      collisionCount++;
      // In real usage, we'd queue combat events here
    });
    
    const collisionTime = performance.now() - startCollision;
    console.log(`SoA Collision detection for ${NUM_UNITS} units: ${collisionTime.toFixed(2)}ms`);
    console.log(`Found ${collisionCount} collisions`);
    
    // Test 2: Batch position updates
    const startMovement = performance.now();
    
    // Set velocities
    for (let i = 0; i < NUM_UNITS; i++) {
      arrays.vx[i] = (Math.random() - 0.5) * 2;
      arrays.vy[i] = (Math.random() - 0.5) * 2;
    }
    
    // Update all positions in one pass
    arrays.updatePositions();
    
    const movementTime = performance.now() - startMovement;
    console.log(`SoA Position update for ${NUM_UNITS} units: ${movementTime.toFixed(2)}ms`);
    
    // Test 3: Spatial queries
    const startQuery = performance.now();
    let totalNearby = 0;
    
    // Sample 50 random points
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const nearby = arrays.findNearby(x, y, 5);
      totalNearby += nearby.length;
    }
    
    const queryTime = performance.now() - startQuery;
    console.log(`SoA Spatial queries (50 queries): ${queryTime.toFixed(2)}ms`);
    
    // Performance assertions
    expect(collisionTime).toBeLessThan(10); // Should be very fast
    expect(movementTime).toBeLessThan(1); // Batch updates are fast
    expect(queryTime).toBeLessThan(5); // Spatial queries reasonable
  });
  
  it('should test proxy performance overhead', () => {
    const NUM_UNITS = 100;
    const arrays = new UnitArrays(NUM_UNITS);
    const manager = new UnitProxyManager(arrays);
    
    // Create units
    for (let i = 0; i < NUM_UNITS; i++) {
      arrays.add(`unit${i}`, i, i, 20, 20, 1);
    }
    
    // Test direct array access
    const startDirect = performance.now();
    for (let iter = 0; iter < 1000; iter++) {
      for (let i = 0; i < NUM_UNITS; i++) {
        arrays.x[i] += 0.1;
        arrays.y[i] += 0.1;
        arrays.hp[i] = Math.max(0, arrays.hp[i] - 1);
      }
    }
    const directTime = performance.now() - startDirect;
    
    // Reset positions
    for (let i = 0; i < NUM_UNITS; i++) {
      arrays.x[i] = i;
      arrays.y[i] = i;
      arrays.hp[i] = 20;
    }
    
    // Test proxy access
    const proxies = manager.getAllProxies();
    const startProxy = performance.now();
    for (let iter = 0; iter < 1000; iter++) {
      for (const proxy of proxies) {
        proxy.pos.x += 0.1;
        proxy.pos.y += 0.1;
        proxy.hp = Math.max(0, proxy.hp - 1);
      }
    }
    const proxyTime = performance.now() - startProxy;
    
    console.log(`\nDirect array access (1000 iterations): ${directTime.toFixed(2)}ms`);
    console.log(`Proxy access (1000 iterations): ${proxyTime.toFixed(2)}ms`);
    console.log(`Proxy overhead: ${((proxyTime / directTime - 1) * 100).toFixed(1)}%`);
    
    // Proxy adds overhead but should still be reasonable
    // In practice, proxies can add 10-20x overhead for simple property access
    expect(proxyTime).toBeLessThan(directTime * 20); // Less than 20x overhead
  });
  
  it('should compare memory layout benefits', () => {
    const NUM_UNITS = 1000;
    const arrays = new UnitArrays(NUM_UNITS);
    
    // Create units
    for (let i = 0; i < NUM_UNITS; i++) {
      arrays.add(`unit${i}`, Math.random() * 100, Math.random() * 100, 20, 20, i % 3);
    }
    
    // Test cache-friendly iteration (all X values sequentially)
    const startCacheFriendly = performance.now();
    let sumX = 0;
    for (let iter = 0; iter < 10000; iter++) {
      for (let i = 0; i < NUM_UNITS; i++) {
        sumX += arrays.x[i];
      }
    }
    const cacheFriendlyTime = performance.now() - startCacheFriendly;
    
    // Test cache-unfriendly pattern (jumping between arrays)
    const startCacheUnfriendly = performance.now();
    let sumTotal = 0;
    for (let iter = 0; iter < 10000; iter++) {
      for (let i = 0; i < NUM_UNITS; i++) {
        sumTotal += arrays.x[i] + arrays.hp[i] + arrays.mass[i];
      }
    }
    const cacheUnfriendlyTime = performance.now() - startCacheUnfriendly;
    
    console.log(`\nCache-friendly access (X only): ${cacheFriendlyTime.toFixed(2)}ms`);
    console.log(`Mixed array access (X+HP+Mass): ${cacheUnfriendlyTime.toFixed(2)}ms`);
    
    // Cache-friendly should be notably faster
    expect(cacheFriendlyTime).toBeLessThan(cacheUnfriendlyTime);
  });
});