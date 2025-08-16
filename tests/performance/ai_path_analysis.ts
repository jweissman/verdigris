import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('AI Path Analysis', () => {
  test('determine which AI processing path is used', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units to match performance test setup
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0.1, y: 0 },
        team: 'neutral',
        hp: 10
      });
    }
    
    console.log('\n=== AI PATH ANALYSIS ===');
    
    // Check if proxy manager exists
    const proxyManager = sim.getProxyManager();
    console.log(`ProxyManager exists: ${!!proxyManager}`);
    
    if (proxyManager) {
      console.log('Will use processAIBatched()');
      
      // Test the batched method performance
      const postures = new Map<string, string>();
      for (const unit of sim.units) {
        if (unit.state !== "dead") {
          postures.set(unit.id, "hunt");
        }
      }
      
      console.log(`Processing AI for ${postures.size} units with postures`);
      
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        const moves = proxyManager.batchProcessAI(postures);
      }
      const time = performance.now() - start;
      
      console.log(`Batched AI (100x): ${(time/100).toFixed(4)}ms per call`);
      
      // Test the batchFindTargets method specifically
      const targetStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const targets = proxyManager.batchFindTargets();
      }
      const targetTime = performance.now() - targetStart;
      
      console.log(`batchFindTargets (100x): ${(targetTime/100).toFixed(4)}ms per call`);
      
    } else {
      console.log('Will use processAllAILegacy()');
    }
    
    // Test a full AI command execution
    const aiCommand = new (require('../../src/commands/ai').AICommand)(sim, sim.getTransform());
    
    const fullStart = performance.now();
    for (let i = 0; i < 10; i++) {
      aiCommand.execute(null, {});
    }
    const fullTime = performance.now() - fullStart;
    
    console.log(`Full AI command (10x): ${(fullTime/10).toFixed(4)}ms per call`);
  });
});