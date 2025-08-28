import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

/**
 * PairwiseBatcherRule - Processes all pairwise intents registered by other rules
 * This makes the N^2 work visible in performance profiles
 */
export class PairwiseBatcherRule extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const batcher = context.getPairwiseBatcher();
    if (!batcher || batcher.intents.length === 0) {
      return [];
    }
    
    // Process all registered intents and collect commands
    const sim = context.getSimulator();
    const commands = batcher.process(sim.units, sim);
    
    // Clear intents after processing
    batcher.intents = [];
    
    return commands || [];
  }
}