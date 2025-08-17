import type { Rule } from "../rules/rule";
import type { TickContext } from "./tick_context";
import type { QueuedCommand } from "../rules/command_handler";

/**
 * Parallel Rule Executor - POC for Worker-based rule execution
 *
 * Key ideas:
 * 1. Rules declare their data dependencies (which components they read/write)
 * 2. Rules that don't conflict can run in parallel
 * 3. Use Workers for CPU-intensive rules, inline for simple ones
 */

export interface RuleDependencies {
  reads: Set<string>; // Components this rule reads (e.g., "pos", "hp", "state")
  writes: Set<string>; // Components this rule modifies
  priority?: number; // Execution priority (lower = earlier)
}

export interface ParallelizableRule extends Rule {
  getDependencies(): RuleDependencies;
  canRunInWorker?: boolean; // Whether this rule benefits from worker isolation
}

export class ParallelRuleExecutor {
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];
  private maxWorkers: number;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(
        new URL("./rule_worker.ts", import.meta.url).href,
      );
      this.workerPool.push(worker);
    }
  }

  /**
   * Execute rules in parallel based on their dependencies
   * Returns all generated commands
   */
  async executeRules(
    rules: ParallelizableRule[],
    context: TickContext,
  ): Promise<QueuedCommand[]> {
    const groups = this.createExecutionGroups(rules);

    const allCommands: QueuedCommand[] = [];

    for (const group of groups) {
      const groupCommands = await this.executeGroup(group, context);
      allCommands.push(...groupCommands);
    }

    return allCommands;
  }

  private createExecutionGroups(
    rules: ParallelizableRule[],
  ): ParallelizableRule[][] {
    const sorted = [...rules].sort((a, b) => {
      const aPriority = a.getDependencies().priority || 999;
      const bPriority = b.getDependencies().priority || 999;
      return aPriority - bPriority;
    });

    const groups: ParallelizableRule[][] = [];
    const processed = new Set<ParallelizableRule>();

    for (const rule of sorted) {
      if (processed.has(rule)) continue;

      const group: ParallelizableRule[] = [rule];
      processed.add(rule);

      const deps = rule.getDependencies();

      for (const other of sorted) {
        if (processed.has(other)) continue;

        const otherDeps = other.getDependencies();

        if (!this.hasConflict(deps, otherDeps)) {
          group.push(other);
          processed.add(other);

          deps.reads = new Set([...deps.reads, ...otherDeps.reads]);
          deps.writes = new Set([...deps.writes, ...otherDeps.writes]);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private hasConflict(a: RuleDependencies, b: RuleDependencies): boolean {
    for (const write of a.writes) {
      if (b.writes.has(write)) return true;
    }

    for (const write of a.writes) {
      if (b.reads.has(write)) return true;
    }
    for (const write of b.writes) {
      if (a.reads.has(write)) return true;
    }

    return false;
  }

  private async executeGroup(
    group: ParallelizableRule[],
    context: TickContext,
  ): Promise<QueuedCommand[]> {
    const promises: Promise<QueuedCommand[]>[] = [];

    for (const rule of group) {
      if (rule.canRunInWorker && this.workerPool.length > 0) {
        promises.push(this.executeInWorker(rule, context));
      } else {
        promises.push(Promise.resolve(rule.execute(context)));
      }
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  private async executeInWorker(
    rule: ParallelizableRule,
    context: TickContext,
  ): Promise<QueuedCommand[]> {
    const worker = this.workerPool.pop();
    if (!worker) {
      return rule.execute(context);
    }

    return new Promise((resolve) => {
      worker.onmessage = (event) => {
        this.workerPool.push(worker); // Return to pool
        resolve(event.data.commands);
      };

      worker.postMessage({
        ruleName: rule.constructor.name,
        contextData: this.serializeContext(context),
      });
    });
  }

  private serializeContext(context: TickContext): any {
    return {
      units: context.getAllUnits().map((u) => ({
        id: u.id,
        pos: u.pos,
        hp: u.hp,
        team: u.team,
        state: u.state,
        meta: u.meta,
      })),
      fieldWidth: context.getFieldWidth(),
      fieldHeight: context.getFieldHeight(),
      ticks: context.getTicks(),
    };
  }

  cleanup(): void {
    for (const worker of this.workerPool) {
      worker.terminate();
    }
    this.workerPool = [];
  }
}

export class ParallelMeleeCombat implements ParallelizableRule {
  getDependencies(): RuleDependencies {
    return {
      reads: new Set(["pos", "hp", "team", "state"]),
      writes: new Set(["hp"]),
      priority: 10,
    };
  }

  canRunInWorker = true;

  execute(context: TickContext): QueuedCommand[] {
    return [];
  }
}
