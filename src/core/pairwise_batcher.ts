// ACTUAL batching system for pairwise operations
// Instead of each rule doing its own N² loop, we collect all the intents
// and process them in a single pass

import { Unit } from '../types/Unit';
import { TargetCache } from './target_cache';
import { SpatialAdjacency } from './spatial_adjacency';

export interface PairwiseIntent {
  ruleId: string;
  maxDistance?: number; // If specified, only consider pairs within this distance
  filter?: (a: Unit, b: Unit) => boolean;
  callback: (a: Unit, b: Unit) => void;
}

export class PairwiseBatcher {
  private intents: PairwiseIntent[] = [];
  public targetCache: TargetCache = new TargetCache();
  private spatialAdjacency?: SpatialAdjacency;
  
  // Rules register their intents here
  register(ruleId: string, callback: (a: Unit, b: Unit) => void, maxDistance?: number, filter?: (a: Unit, b: Unit) => boolean): void {
    this.intents.push({ ruleId, callback, maxDistance, filter });
  }
  
  // Process all registered intents in ONE pass - VECTORIZED!
  process(units: Unit[], sim?: any): void {
    // Try to use typed arrays for massive speedup
    const arrays = sim?.unitArrays;
    
    if (arrays && sim) {
      this.processVectorized(arrays, sim);
    } else {
      this.processLegacy(units);
    }
  }
  
  // ULTRA-FAST VECTORIZED VERSION
  private processVectorized(arrays: any, sim: any): void {
    const capacity = arrays.capacity;
    
    // Build list of active units once
    const activeIndices: number[] = [];
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] && arrays.state[i] !== 3) {
        activeIndices.push(i);
      }
    }
    
    const activeCount = activeIndices.length;
    
    // Use optimized spatial adjacency for common cases (melee, knockback)
    // const hasMeleeOrKnockback = this.intents.some(i => 
    //   i.ruleId === 'MeleeCombat' || i.ruleId === 'Knockback'
    // );
    
    // if (hasMeleeOrKnockback && activeCount > 10) {
    //   this.processSpatialOptimized(arrays, sim, activeIndices);
    //   return;
    // }
    
    // Single tight loop over all pairs with cache-friendly access
    for (let i = 0; i < activeCount; i++) {
      const idxA = activeIndices[i];
      const x1 = arrays.posX[idxA];
      const y1 = arrays.posY[idxA];
      
      for (let j = i + 1; j < activeCount; j++) {
        const idxB = activeIndices[j];
        
        // Vectorized distance calculation
        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;
        
        // Create proxies once for this pair (cached by manager)
        let proxyA: any = null;
        let proxyB: any = null;
        let proxiesCreated = false;
        
        // Check all intents for this pair
        for (const intent of this.intents) {
          // Fast distance check
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq) continue;
          }
          
          // Lazy proxy creation - only if needed
          if (!proxiesCreated) {
            proxyA = sim.proxyManager.getProxy(idxA);
            proxyB = sim.proxyManager.getProxy(idxB);
            proxiesCreated = true;
          }
          
          if (intent.filter && !intent.filter(proxyA, proxyB)) continue;
          
          intent.callback(proxyA, proxyB);
          intent.callback(proxyB, proxyA);
        }
      }
    }
    
    // Clear intents after processing
    this.intents = [];
  }
  
  // Fallback for non-SoA mode
  private processLegacy(units: Unit[]): void {
    // Clear and initialize target cache for all units
    this.targetCache.clear();
    for (const unit of units) {
      if (unit.state !== 'dead') {
        this.targetCache.initUnit(unit.id);
      }
    }
    
    // Single O(N²) pass through all pairs
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const unitA = units[i];
        const unitB = units[j];
        
        // Calculate distance once for this pair
        const dx = unitA.pos.x - unitB.pos.x;
        const dy = unitA.pos.y - unitB.pos.y;
        const distSq = dx * dx + dy * dy;
        
        // Update target cache for this pair
        this.targetCache.updatePair(unitA, unitB, distSq);
        
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
  
  // Optimized spatial processing for melee/knockback
  private processSpatialOptimized(arrays: any, sim: any, activeIndices: number[]): void {
    // Initialize spatial grid if needed
    if (!this.spatialAdjacency) {
      this.spatialAdjacency = new SpatialAdjacency(sim.fieldWidth, sim.fieldHeight);
    }
    
    // Build spatial grid
    this.spatialAdjacency.buildFromArrays(arrays, activeIndices);
    
    // Process intents by type
    for (const intent of this.intents) {
      if (intent.ruleId === 'MeleeCombat') {
        // Use specialized melee processing
        const pairs = this.spatialAdjacency.getMeleePairs(arrays);
        
        for (const [idxA, idxB] of pairs) {
          // Only create proxies when needed
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          
          // Apply filter if any
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else if (intent.ruleId === 'Knockback') {
        // Use specialized knockback processing
        const pairs = this.spatialAdjacency.getKnockbackPairs(arrays);
        
        for (const [idxA, idxB] of pairs) {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else {
        // Fallback to general spatial processing for other intents
        const maxDistSq = intent.maxDistance ? intent.maxDistance * intent.maxDistance : 100;
        
        this.spatialAdjacency.processAdjacent(arrays, maxDistSq, (idxA, idxB, distSq) => {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);
          
          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
            intent.callback(proxyB, proxyA);
          }
        });
      }
    }
    
    // Clear intents after processing
    this.intents = [];
  }
}