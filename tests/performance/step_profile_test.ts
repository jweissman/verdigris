import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Step Phase Profiling', () => {
  test('Detailed step phase breakdown', () => {
    const sim = new Simulator(50, 50);
    sim.enableProfiling = true;
    
    // Add 50 stationary units to isolate overhead
    for (let i = 0; i < 50; i++) {
      sim.addUnit({
        id: `unit_${i}`,
        pos: { x: i % 50, y: Math.floor(i / 50) },
        intendedMove: { x: 0, y: 0 },
        team: 'neutral',
        hp: 20,
        abilities: []
      });
    }
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      sim.step();
    }
    
    const phases = {
      spatialCheck: 0,
      spatialRebuild: 0,
      contextCreation: 0,
      ruleExecution: 0,
      commandProcessing: 0,
      updateChangedUnits: 0,
      environmentalFx: 0,
      total: 0
    };
    
    const iterations = 1000;
    
    // Manual profiling of step phases
    for (let i = 0; i < iterations; i++) {
      const stepStart = performance.now();
      
      // Manually run step phases with timing
      sim.ticks++;
      sim.changedUnits = new Set(sim.dirtyUnits);
      sim.dirtyUnits.clear();
      
      // Phase 1: Spatial check
      const spatialStart = performance.now();
      let needsSpatialRebuild = sim.ticks === 0 || 
        sim.unitArrays.activeCount !== sim.lastActiveCount;
      phases.spatialCheck += performance.now() - spatialStart;
      
      // Phase 2: Spatial rebuild (if needed)
      if (needsSpatialRebuild) {
        const rebuildStart = performance.now();
        sim.gridPartition.clear();
        sim.unitCache.clear();
        
        const arrays = sim.unitArrays;
        for (const idx of arrays.activeIndices) {
          const id = arrays.unitIds[idx];
          let proxy = sim.unitCache.get(id);
          if (!proxy) {
            proxy = sim.proxyManager.getProxy(idx);
            sim.unitCache.set(id, proxy);
          }
          sim.gridPartition.insert(proxy);
        }
        sim.lastActiveCount = arrays.activeCount;
        phases.spatialRebuild += performance.now() - rebuildStart;
      }
      
      // Phase 3: Context creation
      const contextStart = performance.now();
      const context = sim.getTickContext();
      phases.contextCreation += performance.now() - contextStart;
      
      // Phase 4: Rule execution
      const ruleStart = performance.now();
      const allCommands = [];
      for (const rule of sim.rulebook) {
        const commands = rule.execute(context);
        if (commands?.length) {
          allCommands.push(...commands);
        }
      }
      phases.ruleExecution += performance.now() - ruleStart;
      
      // Track command counts
      if (i === 0) {
        console.log(`Commands generated: ${allCommands.length}`);
        const typeCounts = {};
        for (const cmd of allCommands) {
          typeCounts[cmd.type] = (typeCounts[cmd.type] || 0) + 1;
        }
        console.log('Command types:', typeCounts);
      }
      
      // Phase 5: Command processing with iteration tracking
      const cmdStart = performance.now();
      sim.queuedCommands = allCommands;
      
      // Track fixpoint iterations
      let iterations = 0;
      let commandsProcessed = 0;
      let eventsProcessed = 0;
      
      while ((sim.queuedCommands?.length > 0 || sim.queuedEvents?.length > 0) && iterations < 10) {
        iterations++;
        const cmdCount = sim.queuedCommands?.length || 0;
        const eventCount = sim.queuedEvents?.length || 0;
        
        if (i === 0 && iterations <= 3) {
          console.log(`  Iteration ${iterations}: ${cmdCount} commands, ${eventCount} events`);
        }
        
        commandsProcessed += cmdCount;
        eventsProcessed += eventCount;
        
        // Run one iteration
        const commandsToProcess = sim.queuedCommands || [];
        sim.queuedCommands = [];
        for (const cmd of commandsToProcess) {
          sim.commandProcessor.executeOne?.(cmd, context);
        }
        
        // Process events
        if (sim.queuedEvents?.length > 0) {
          const events = sim.queuedEvents;
          sim.queuedEvents = [];
          // Events might generate new commands
        }
      }
      
      if (i === 0) {
        console.log(`  Total iterations: ${iterations}`);
        console.log(`  Commands processed: ${commandsProcessed}`);
        console.log(`  Events processed: ${eventsProcessed}`);
      }
      
      phases.commandProcessing += performance.now() - cmdStart;
      
      // Phase 6: Update changed units
      const updateStart = performance.now();
      sim.updateChangedUnits();
      phases.updateChangedUnits += performance.now() - updateStart;
      
      // Phase 7: Environmental effects (particles, weather, etc)
      const envStart = performance.now();
      if (sim.projectiles?.length) {
        sim.updateProjectilePhysics();
      }
      if (sim.particleArrays?.activeCount) {
        sim.updateParticles();
      }
      phases.environmentalFx += performance.now() - envStart;
      
      phases.total += performance.now() - stepStart;
    }
    
    // Average all phases
    for (const key in phases) {
      phases[key] /= iterations;
    }
    
    // Calculate overhead
    const overhead = phases.total - phases.ruleExecution;
    
    console.log('\n=== Step Phase Breakdown (50 units, 1000 iterations) ===');
    console.log(`Spatial Check:      ${phases.spatialCheck.toFixed(4)}ms (${((phases.spatialCheck / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Spatial Rebuild:    ${phases.spatialRebuild.toFixed(4)}ms (${((phases.spatialRebuild / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Context Creation:   ${phases.contextCreation.toFixed(4)}ms (${((phases.contextCreation / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Rule Execution:     ${phases.ruleExecution.toFixed(4)}ms (${((phases.ruleExecution / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Command Processing: ${phases.commandProcessing.toFixed(4)}ms (${((phases.commandProcessing / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Update Changed:     ${phases.updateChangedUnits.toFixed(4)}ms (${((phases.updateChangedUnits / phases.total) * 100).toFixed(1)}%)`);
    console.log(`Environmental FX:   ${phases.environmentalFx.toFixed(4)}ms (${((phases.environmentalFx / phases.total) * 100).toFixed(1)}%)`);
    console.log('----------------------------------------');
    console.log(`TOTAL:             ${phases.total.toFixed(4)}ms`);
    console.log(`Overhead:          ${overhead.toFixed(4)}ms (${((overhead / phases.total) * 100).toFixed(1)}%)`);
    console.log(`\nBudget: 0.01ms, Actual: ${phases.total.toFixed(4)}ms (${(phases.total / 0.01).toFixed(1)}x over)`);
    
    expect(phases.total).toBeLessThan(0.01);
  });
});