import { Simulator } from "../core/simulator";
import type { Unit } from "../types/Unit";

export abstract class Rule {
  simulator: Simulator;
  
  constructor(simulator: Simulator) {
    this.simulator = simulator;
  }

  get rng() { return Simulator.rng }
 
  execute(): void {
    this.apply();
  }

  abstract apply(): void;

  protected get sim(): Simulator {
    return this.simulator;
  }

  // Register intent for pairwise operations (ACTUALLY batched now!)
  protected pairwise(callback: (a: Unit, b: Unit) => void, maxDistance?: number): void {
    if (this.sim.pairwiseBatcher) {
      // Register the intent - it will be processed in a single pass later
      const ruleId = this.constructor.name;
      this.sim.pairwiseBatcher.register(ruleId, callback, maxDistance);
    } else {
      // Fallback to O(N²) if no batching available
      for (let i = 0; i < this.sim.units.length; i++) {
        for (let j = 0; j < this.sim.units.length; j++) {
          if (i !== j) {
            callback(this.sim.units[i], this.sim.units[j]);
          }
        }
      }
    }
  }
  
  // Helper to find units within radius (batched)
  protected unitsWithinRadius(center: { x: number, y: number }, radius: number, filter?: (unit: Unit) => boolean): Unit[] {
    if (this.sim.spatialQueries) {
      let result: Unit[] = [];
      this.sim.spatialQueries.queryRadius(center, radius, (units) => {
        result = units;
      }, filter);
      // Process immediately for now (until we properly integrate batching)
      this.sim.spatialQueries.processQueries(this.sim.units);
      return result;
    }
    
    // Fallback to direct calculation
    const radiusSq = radius * radius;
    return this.sim.units.filter(unit => {
      const dx = unit.pos.x - center.x;
      const dy = unit.pos.y - center.y;
      const distSq = dx * dx + dy * dy;
      return distSq <= radiusSq && (!filter || filter(unit));
    });
  }
}
