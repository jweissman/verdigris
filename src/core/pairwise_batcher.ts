// ACTUAL batching system for pairwise operations
// Instead of each rule doing its own N² loop, we collect all the intents
// and process them in a single pass

import { Unit } from '../types/Unit';

export interface PairwiseIntent {
  ruleId: string;
  maxDistance?: number; // If specified, only consider pairs within this distance
  filter?: (a: Unit, b: Unit) => boolean;
  callback: (a: Unit, b: Unit) => void;
}

export class PairwiseBatcher {
  private intents: PairwiseIntent[] = [];
  
  // Rules register their intents here
  register(ruleId: string, callback: (a: Unit, b: Unit) => void, maxDistance?: number, filter?: (a: Unit, b: Unit) => boolean): void {
    this.intents.push({ ruleId, callback, maxDistance, filter });
  }
  
  // Process all registered intents in ONE pass
  process(units: Unit[]): void {
    if (this.intents.length === 0) return;
    
    // Single O(N²) pass through all pairs
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const unitA = units[i];
        const unitB = units[j];
        
        // Calculate distance once for this pair
        const dx = unitA.pos.x - unitB.pos.x;
        const dy = unitA.pos.y - unitB.pos.y;
        const distSq = dx * dx + dy * dy;
        
        // Execute all intents that care about this pair
        for (const intent of this.intents) {
          // Check distance constraint if specified
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq) continue;
          }
          
          // Check custom filter if specified
          if (intent.filter && !intent.filter(unitA, unitB)) continue;
          
          // Execute the callback for both directions
          intent.callback(unitA, unitB);
          intent.callback(unitB, unitA);
        }
      }
    }
    
    // Clear intents after processing
    this.intents = [];
  }
  
  // Get stats for debugging
  getStats(): { intentCount: number, rules: string[] } {
    const rules = [...new Set(this.intents.map(i => i.ruleId))];
    return {
      intentCount: this.intents.length,
      rules
    };
  }
}