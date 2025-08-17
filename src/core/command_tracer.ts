/**
 * Command tracer to track provenance and detect loops
 */
export class CommandTracer {
  private commandChain: Map<string, string[]> = new Map();
  private currentDepth = 0;
  private maxDepth = 10;

  startCommand(type: string, source: string): void {
    this.currentDepth++;
    if (this.currentDepth > this.maxDepth) {
      console.warn(`Command depth exceeded! Chain: ${this.getChain(type)}`);
    }

    const chain = this.commandChain.get(type) || [];
    chain.push(source);
    this.commandChain.set(type, chain);
  }

  endCommand(type: string): void {
    this.currentDepth--;
  }

  getChain(type: string): string {
    return (this.commandChain.get(type) || []).join(" -> ");
  }

  reset(): void {
    this.commandChain.clear();
    this.currentDepth = 0;
  }

  detectLoops(): string[] {
    const loops: string[] = [];
    for (const [type, chain] of this.commandChain) {
      const seen = new Set<string>();
      for (const source of chain) {
        if (seen.has(source)) {
          loops.push(`Loop detected in ${type}: ${chain.join(" -> ")}`);
          break;
        }
        seen.add(source);
      }
    }
    return loops;
  }
}
