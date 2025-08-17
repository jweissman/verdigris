import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Trace getAllUnits calls', () => {
  test('Count getAllUnits calls per step', () => {
    const sim = new Simulator(50, 50);
    

    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 20,
        abilities: []
      });
    }
    

    let callCount = 0;
    let proxyCreations = 0;
    
    const context = sim.getTickContext();
    const originalGetAllUnits = context.getAllUnits.bind(context);
    context.getAllUnits = function() {
      callCount++;
      return originalGetAllUnits();
    };
    

    const originalGetAllProxies = sim.proxyManager.getAllProxies.bind(sim.proxyManager);
    sim.proxyManager.getAllProxies = function() {
      proxyCreations++;
      return originalGetAllProxies();
    };
    

    console.log('\n=== Tracing getAllUnits calls ===');
    
    for (const rule of sim.rulebook) {
      const ruleName = rule.constructor.name;
      const beforeCalls = callCount;
      const beforeProxies = proxyCreations;
      
      rule.execute(context);
      
      const ruleCalls = callCount - beforeCalls;
      const ruleProxies = proxyCreations - beforeProxies;
      
      if (ruleCalls > 0) {
        console.log(`${ruleName}: ${ruleCalls} getAllUnits calls, ${ruleProxies} proxy creations`);
      }
    }
    
    console.log(`\nTotal: ${callCount} getAllUnits calls, ${proxyCreations} proxy creations`);
    console.log(`With 50 units, that's ${proxyCreations * 50} proxy objects created per step`);
  });
});