import { Command } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Higher-order 'ai' command - bulk AI processing and intent setting
 * Replaces individual target/pose commands with vectorized AI updates
 */
export class AICommand extends Command {
  private transform: any;

  constructor(sim: any, transform: any) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    this.processAllAI();

    this.handleWoodlandSummoning();
  }

  private processAllAI(): void {
    this.processAIBatched();
  }

  private processAIBatched(): void {
    const postures = new Map<string, string>();
    const arrays = this.sim.getUnitArrays();
    const coldData = (this.sim as any).unitColdData;
    
    // Direct array access for performance
    for (const i of arrays.activeIndices) {
      if (arrays.state[i] === 3) continue; // Skip dead
      
      const unitId = arrays.unitIds[i];
      const data = coldData.get(unitId);
      
      let posture = data?.posture || data?.meta?.posture;
      if (!posture && data?.tags) {
        if (data.tags.includes("hunt")) posture = "hunt";
        else if (data.tags.includes("guard")) posture = "guard";
        else if (data.tags.includes("swarm")) posture = "swarm";
        else if (data.tags.includes("wander")) posture = "wander";
        else if (data.tags.includes("aggressive")) posture = "bully";
      }
      postures.set(unitId, posture || "wait");
    }

    const proxyManager = this.sim.getProxyManager();
    const moves = proxyManager.batchProcessAI(postures);

    for (const [unitId, move] of moves) {
      if (move.dx !== 0 || move.dy !== 0) {
        this.sim.queuedCommands.push({
          type: "move",
          params: { unitId, dx: move.dx, dy: move.dy },
        });
      }
    }
  }


  private handleWoodlandSummoning(): void {
    // TODO: Implement woodland summoning logic
    // This was removed during cleanup but is still referenced
  }
}
