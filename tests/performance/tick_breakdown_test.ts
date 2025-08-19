import { describe, test } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Full Tick Performance Breakdown', () => {
  test('measure rules vs commands', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    

    const stepTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      sim.step();
      stepTimes.push(performance.now() - start);
    }
    stepTimes.sort((a, b) => a - b);
    const stepMedian = stepTimes[50];
    

    const ruleTimes = [];
    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      for (const rule of sim.rulebook) {
        rule.execute(context);
      }
      ruleTimes.push(performance.now() - start);
    }
    ruleTimes.sort((a, b) => a - b);
    const rulesMedian = ruleTimes[50];
    

    const commandHandler = sim.rulebook.find(r => r.constructor.name === 'CommandHandler');
    const commandTimes = [];
    
    if (commandHandler) {
      for (let i = 0; i < 100; i++) {

        sim.queuedCommands = [];
        for (const rule of sim.rulebook) {
          if (rule !== commandHandler) {
            const cmds = rule.execute(context);
            if (cmds?.length > 0) {
              sim.queuedCommands.push(...cmds);
            }
          }
        }
        
        const cmdCount = sim.queuedCommands.length;
        

        const start = performance.now();
        commandHandler.execute(context);
        commandTimes.push(performance.now() - start);
      }
      commandTimes.sort((a, b) => a - b);
    }
    
    const commandMedian = commandTimes.length > 0 ? commandTimes[50] : 0;
    
    console.log('\n=== PERFORMANCE BREAKDOWN ===');
    console.log(`Full step:     ${stepMedian.toFixed(4)}ms`);
    console.log(`Rules only:    ${rulesMedian.toFixed(4)}ms`);
    console.log(`Commands only: ${commandMedian.toFixed(4)}ms`);
    console.log(`Other/overhead: ${(stepMedian - rulesMedian - commandMedian).toFixed(4)}ms`);
    
    console.log('\n=== BUDGET ANALYSIS ===');
    const totalBudget = 0.01; // 10ms total step budget
    console.log(`Step budget:   ${totalBudget}ms`);
    console.log(`Step actual:   ${stepMedian.toFixed(4)}ms (${((stepMedian/totalBudget)*100).toFixed(0)}% of budget)`);
    
    if (stepMedian <= totalBudget) {
      console.log('✅ WITHIN BUDGET!');
    } else {
      console.log(`❌ OVER BUDGET by ${(stepMedian - totalBudget).toFixed(4)}ms`);
    }
    

    console.log('\n=== TIME DISTRIBUTION ===');
    console.log(`Rules:    ${((rulesMedian/stepMedian)*100).toFixed(1)}%`);
    console.log(`Commands: ${((commandMedian/stepMedian)*100).toFixed(1)}%`);
    console.log(`Other:    ${(((stepMedian - rulesMedian - commandMedian)/stepMedian)*100).toFixed(1)}%`);
  });
});