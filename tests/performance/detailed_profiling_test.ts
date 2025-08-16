import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Detailed Performance Profiling', () => {
  test('Profile individual rule execution times', () => {
    const sim = new Simulator(50, 50);
    
    // Add 50 units
    for (let i = 0; i < 25; i++) {
      sim.addUnit({
        id: `friendly_${i}`,
        pos: { x: i % 10, y: Math.floor(i / 10) },
        team: 'friendly',
        hp: 20
      });
      sim.addUnit({
        id: `hostile_${i}`,
        pos: { x: 40 + (i % 10), y: Math.floor(i / 10) },
        team: 'hostile',
        hp: 20
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Profile each rule individually
    const ruleTimings: Map<string, number[]> = new Map();
    
    // Store original step function
    const originalStep = sim.step.bind(sim);
    
    // Override step to measure each rule
    (sim as any).step = function() {
      const context = (this as any).createContext();
      
      for (const rule of (this as any).rulebook) {
        const ruleName = rule.constructor.name;
        if (!ruleTimings.has(ruleName)) {
          ruleTimings.set(ruleName, []);
        }
        
        const start = performance.now();
        const commands = rule.execute(context);
        const ruleTime = performance.now() - start;
        ruleTimings.get(ruleName)!.push(ruleTime);
        
        // Execute commands
        if (commands && commands.length > 0) {
          for (const cmd of commands) {
            (this as any).commandHandler.executeCommand(cmd);
          }
        }
      }
      
      // Execute queued commands
      (this as any).executeQueuedCommands();
      (this as any).executeQueuedEvents();
      (this as any).tick++;
    };
    
    // Run profiling
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Analyze results
    console.log('\n=== Rule Execution Times ===');
    const ruleSummary: Array<{name: string, avg: number, total: number}> = [];
    let totalTime = 0;
    
    for (const [ruleName, times] of ruleTimings) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const total = times.reduce((a, b) => a + b, 0);
      totalTime += total;
      ruleSummary.push({ name: ruleName, avg, total });
    }
    
    // Sort by total time
    ruleSummary.sort((a, b) => b.total - a.total);
    
    for (const rule of ruleSummary) {
      const percent = (rule.total / totalTime * 100).toFixed(1);
      console.log(`${rule.name}: avg=${rule.avg.toFixed(4)}ms, total=${rule.total.toFixed(2)}ms (${percent}%)`);
    }
    
    // Find the slowest rules
    const slowestRules = ruleSummary.slice(0, 3);
    console.log('\n=== Top 3 Bottlenecks ===');
    for (const rule of slowestRules) {
      console.log(`${rule.name}: ${rule.avg.toFixed(4)}ms per tick`);
    }
  });
  
  test('Profile command execution overhead', () => {
    const sim = new Simulator(50, 50);
    
    // Add units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Measure command execution
    const commandTypes: Map<string, number[]> = new Map();
    
    // Hook into command handler
    const handler = (sim as any).commandHandler;
    const originalExecute = handler.executeCommand.bind(handler);
    
    handler.executeCommand = function(cmd: any) {
      const type = cmd.type || 'unknown';
      if (!commandTypes.has(type)) {
        commandTypes.set(type, []);
      }
      
      const start = performance.now();
      originalExecute(cmd);
      const time = performance.now() - start;
      commandTypes.get(type)!.push(time);
    };
    
    // Run test
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    // Analyze command overhead
    console.log('\n=== Command Execution Times ===');
    const cmdSummary: Array<{type: string, count: number, avg: number, total: number}> = [];
    
    for (const [type, times] of commandTypes) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const total = times.reduce((a, b) => a + b, 0);
      cmdSummary.push({ type, count: times.length, avg, total });
    }
    
    cmdSummary.sort((a, b) => b.total - a.total);
    
    for (const cmd of cmdSummary) {
      console.log(`${cmd.type}: count=${cmd.count}, avg=${cmd.avg.toFixed(4)}ms, total=${cmd.total.toFixed(2)}ms`);
    }
  });
  
  test('Profile proxy overhead vs direct array access', () => {
    const sim = new Simulator(50, 50);
    
    // Add units
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        team: 'neutral',
        hp: 10
      });
    }
    
    const arrays = sim.getUnitArrays();
    const units = sim.units;
    
    // Test proxy access
    const proxyTimes: number[] = [];
    for (let i = 0; i < 10000; i++) {
      const start = performance.now();
      for (const unit of units) {
        const _ = unit.pos.x + unit.pos.y + unit.hp;
      }
      proxyTimes.push(performance.now() - start);
    }
    
    // Test direct array access
    const directTimes: number[] = [];
    for (let i = 0; i < 10000; i++) {
      const start = performance.now();
      for (let j = 0; j < arrays.activeCount; j++) {
        const idx = arrays.activeIndices[j];
        const _ = arrays.posX[idx] + arrays.posY[idx] + arrays.hp[idx];
      }
      directTimes.push(performance.now() - start);
    }
    
    const proxyAvg = proxyTimes.reduce((a, b) => a + b, 0) / proxyTimes.length;
    const directAvg = directTimes.reduce((a, b) => a + b, 0) / directTimes.length;
    const overhead = ((proxyAvg - directAvg) / directAvg * 100).toFixed(1);
    
    console.log('\n=== Proxy vs Direct Access ===');
    console.log(`Proxy access: ${proxyAvg.toFixed(4)}ms`);
    console.log(`Direct access: ${directAvg.toFixed(4)}ms`);
    console.log(`Proxy overhead: ${overhead}%`);
    
    expect(proxyAvg).toBeLessThan(directAvg * 5); // Proxy should be at most 5x slower
  });
  
  test('Profile scalar field computations', () => {
    const sim = new Simulator(50, 50);
    
    // Add units spread across the field
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: Math.random() * 50, y: Math.random() * 50 },
        team: i % 2 === 0 ? 'friendly' : 'hostile',
        hp: 20
      });
    }
    
    // Test scalar field operations
    const scalarField = (sim as any).scalarField;
    if (scalarField) {
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        scalarField.rebuild(sim.units);
        times.push(performance.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      console.log('\n=== Scalar Field Performance ===');
      console.log(`Rebuild time: ${avg.toFixed(4)}ms`);
      
      // Test field queries
      const queryTimes: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        for (let x = 0; x < 50; x += 5) {
          for (let y = 0; y < 50; y += 5) {
            scalarField.getAttractionAt(x, y, 'friendly');
          }
        }
        queryTimes.push(performance.now() - start);
      }
      
      const queryAvg = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      console.log(`Query time (100 samples): ${queryAvg.toFixed(4)}ms`);
    }
  });
});