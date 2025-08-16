import { Command } from "../rules/command";

/**
 * A tick command that simply calls the normal simulation step
 * This allows higher-level orchestration to queue a single command
 * rather than hundreds of individual commands
 */
export class SimulateCommand extends Command {
  execute(unitId: string | null, params: Record<string, any>): void {
    if (this.sim.step) {
      this.sim.step();
    }
  }
}
