import { Simulator } from '../src/core/simulator';

// Global simulator instance for test reuse
let globalSim: Simulator | null = null;

// Attach to globalThis for test access
(globalThis as any).getTestSimulator = (width = 20, height = 20): Simulator => {
  if (!globalSim) {
    globalSim = new Simulator(width, height);
  }
  return globalSim;
};

(globalThis as any).resetTestSimulator = (): void => {
  if (globalSim) {
    // Clear all units
    globalSim.units.length = 0;
    globalSim.bufferA.length = 0;
    globalSim.bufferB.length = 0;
    
    // Reset state
    globalSim.ticks = 0;
    globalSim.queuedCommands = [];
    globalSim.queuedEvents = [];
    
    // Clear caches
    if (globalSim.targetCache) {
      globalSim.targetCache.clear();
    }
    if (globalSim.pairwiseBatcher) {
      globalSim.pairwiseBatcher.targetCache.clear();
    }
  }
};

console.debug('Test setup loaded - use getTestSimulator() and resetTestSimulator()');