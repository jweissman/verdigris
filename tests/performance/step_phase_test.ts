import { describe, test, expect } from 'bun:test';
import { createTestSimulator } from './perf_support';

describe('Step Phase Timing', () => {
  test('measure rule vs command execution time', () => {
    const sim = createTestSimulator(50);
    const context = sim.getTickContext();
    
    // Profile phases
    const phases = {
      ruleExecution: 0,
      commandExecution: 0,
      spatialRebuild: 0,
      cleanup: 0,
      total: 0
    };
    
    // Override step to instrument phases
    const originalStep = sim.step.bind(sim);
    const originalExecuteCommands = (sim as any).executeQueuedCommands?.bind(sim);
    
    // Measure one complete step
    const stepStart = performance.now();
    
    // Rules phase
    const rulesStart = performance.now();
    const commands: any[] = [];
    for (const rule of sim.rulebook) {
      const ruleCommands = rule.execute(context);
      if (ruleCommands) {
        commands.push(...ruleCommands);
      }
    }
    phases.ruleExecution = performance.now() - rulesStart;
    
    // Command execution phase
    if (originalExecuteCommands) {
      const commandsStart = performance.now();
      (sim as any).commandQueue = commands;
      originalExecuteCommands();
      phases.commandExecution = performance.now() - commandsStart;
    }
    
    phases.total = performance.now() - stepStart;
    
    console.log('\n=== Step Phase Breakdown ===');
    console.log(`Total step time: ${phases.total.toFixed(4)}ms`);
    console.log(`Rule execution: ${phases.ruleExecution.toFixed(4)}ms (${(phases.ruleExecution/phases.total*100).toFixed(1)}%)`);
    console.log(`Command execution: ${phases.commandExecution.toFixed(4)}ms (${(phases.commandExecution/phases.total*100).toFixed(1)}%)`);
    console.log(`Other: ${(phases.total - phases.ruleExecution - phases.commandExecution).toFixed(4)}ms`);
    
    // Count commands by type
    const commandCounts = new Map<string, number>();
    for (const cmd of commands) {
      const type = cmd.type || 'unknown';
      commandCounts.set(type, (commandCounts.get(type) || 0) + 1);
    }
    
    console.log('\n=== Commands Generated ===');
    for (const [type, count] of commandCounts) {
      console.log(`${type}: ${count}`);
    }
    
    expect(phases.ruleExecution).toBeLessThan(phases.total * 0.5); // Rules should be <50% of total
  });
});