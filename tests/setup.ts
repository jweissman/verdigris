import { Simulator } from '../src/core/simulator';


let globalSim: Simulator | null = null;


(globalThis as any).getTestSimulator = (width = 20, height = 20): Simulator => {
  if (!globalSim) {
    globalSim = new Simulator(width, height);
  }
  return globalSim;
};

(globalThis as any).resetTestSimulator = (): void => {
  if (globalSim) {

    globalSim.units.length = 0;
    globalSim.bufferA.length = 0;
    globalSim.bufferB.length = 0;
    

    globalSim.ticks = 0;
    globalSim.queuedCommands = [];
    globalSim.queuedEvents = [];
    

    if (globalSim.targetCache) {
      globalSim.targetCache.clear();
    }
    if (globalSim.pairwiseBatcher) {
      globalSim.pairwiseBatcher.targetCache.clear();
    }
  }
};

console.debug('Test setup loaded - use getTestSimulator() and resetTestSimulator()');