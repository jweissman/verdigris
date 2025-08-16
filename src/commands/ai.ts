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
    for (const unit of this.sim.units) {
      if (unit.state !== "dead") {
        let posture = unit.posture || unit.meta?.posture;
        if (!posture && unit.tags) {
          if (unit.tags.includes("hunt")) posture = "hunt";
          else if (unit.tags.includes("guard")) posture = "guard";
          else if (unit.tags.includes("swarm")) posture = "swarm";
          else if (unit.tags.includes("wander")) posture = "wander";
          else if (unit.tags.includes("aggressive")) posture = "bully";
        }
        postures.set(unit.id, posture || "wait");
      }
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
