import { Unit } from "../types/Unit";
import { TargetCache } from "./target_cache";
import { SpatialAdjacency } from "./spatial_adjacency";

export interface PairwiseIntent {
  ruleId: string;
  maxDistance?: number; // If specified, only consider pairs within this distance
  filter?: (a: Unit, b: Unit) => boolean;
  callback: (a: Unit, b: Unit) => any[]; // Returns commands
}

export class PairwiseBatcher {
  public intents: PairwiseIntent[] = [];
  public targetCache: TargetCache = new TargetCache();
  private spatialAdjacency?: SpatialAdjacency;

  private collectedCommands: any[] = [];
  
  register(
    ruleId: string,
    callback: (a: Unit, b: Unit) => any[],
    maxDistance?: number,
    filter?: (a: Unit, b: Unit) => boolean,
  ): void {
    this.intents.push({ ruleId, callback, maxDistance, filter });
  }

  process(units: Unit[], sim?: any): any[] {
    this.collectedCommands = [];
    const arrays = sim?.unitArrays;

    if (arrays && sim) {
      this.processVectorized(arrays, sim);
    } else {
      this.processLegacy(units);
    }
    
    return this.collectedCommands;
  }

  private processVectorized(arrays: any, sim: any): void {
    const capacity = arrays.capacity;

    const activeIndices: number[] = [];
    for (let i = 0; i < capacity; i++) {
      if (arrays.active[i] && arrays.state[i] !== 3) {
        activeIndices.push(i);
      }
    }

    const activeCount = activeIndices.length;

    for (let i = 0; i < activeCount; i++) {
      const idxA = activeIndices[i];
      const x1 = arrays.posX[idxA];
      const y1 = arrays.posY[idxA];

      for (let j = i + 1; j < activeCount; j++) {
        const idxB = activeIndices[j];

        const dx = arrays.posX[idxB] - x1;
        const dy = arrays.posY[idxB] - y1;
        const distSq = dx * dx + dy * dy;

        let proxyA: any = null;
        let proxyB: any = null;
        let proxiesCreated = false;

        for (const intent of this.intents) {
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq) continue;
          }

          if (!proxiesCreated) {
            proxyA = sim.proxyManager.getProxy(idxA);
            proxyB = sim.proxyManager.getProxy(idxB);
            proxiesCreated = true;
          }

          if (intent.filter && !intent.filter(proxyA, proxyB)) continue;

          // Call callback for both directions to match legacy behavior
          const commandsAB = intent.callback(proxyA, proxyB);
          if (commandsAB && commandsAB.length > 0) {
            this.collectedCommands.push(...commandsAB);
          }
          const commandsBA = intent.callback(proxyB, proxyA);
          if (commandsBA && commandsBA.length > 0) {
            this.collectedCommands.push(...commandsBA);
          }
        }
      }
    }

    this.intents = [];
  }

  private processLegacy(units: Unit[]): void {
    this.targetCache.clear();
    for (const unit of units) {
      if (unit.state !== "dead") {
        this.targetCache.initUnit(unit.id);
      }
    }

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const unitA = units[i];
        const unitB = units[j];

        const dx = unitA.pos.x - unitB.pos.x;
        const dy = unitA.pos.y - unitB.pos.y;
        const distSq = dx * dx + dy * dy;

        this.targetCache.updatePair(unitA, unitB, distSq);

        for (const intent of this.intents) {
          if (intent.maxDistance !== undefined) {
            const maxDistSq = intent.maxDistance * intent.maxDistance;
            if (distSq > maxDistSq) continue;
          }

          if (intent.filter && !intent.filter(unitA, unitB)) continue;

          intent.callback(unitA, unitB);
          intent.callback(unitB, unitA);
        }
      }
    }

    this.intents = [];
  }

  getStats(): { intentCount: number; rules: string[] } {
    const rules = [...new Set(this.intents.map((i) => i.ruleId))];
    return {
      intentCount: this.intents.length,
      rules,
    };
  }

  private processSpatialOptimized(
    arrays: any,
    sim: any,
    activeIndices: number[],
  ): void {
    if (!this.spatialAdjacency) {
      this.spatialAdjacency = new SpatialAdjacency(
        sim.fieldWidth,
        sim.fieldHeight,
      );
    }

    this.spatialAdjacency.buildFromArrays(arrays, activeIndices);

    for (const intent of this.intents) {
      if (intent.ruleId === "MeleeCombat") {
        const pairs = this.spatialAdjacency.getMeleePairs(arrays);

        for (const [idxA, idxB] of pairs) {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);

          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else if (intent.ruleId === "Knockback") {
        const pairs = this.spatialAdjacency.getKnockbackPairs(arrays);

        for (const [idxA, idxB] of pairs) {
          const proxyA = sim.proxyManager.getProxy(idxA);
          const proxyB = sim.proxyManager.getProxy(idxB);

          if (!intent.filter || intent.filter(proxyA, proxyB)) {
            intent.callback(proxyA, proxyB);
          }
        }
      } else {
        const maxDistSq = intent.maxDistance
          ? intent.maxDistance * intent.maxDistance
          : 100;

        this.spatialAdjacency.processAdjacent(
          arrays,
          maxDistSq,
          (idxA, idxB, distSq) => {
            const proxyA = sim.proxyManager.getProxy(idxA);
            const proxyB = sim.proxyManager.getProxy(idxB);

            if (!intent.filter || intent.filter(proxyA, proxyB)) {
              intent.callback(proxyA, proxyB);
              intent.callback(proxyB, proxyA);
            }
          },
        );
      }
    }

    this.intents = [];
  }
}
