import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import { Ao } from "../lang/ao";
import { createGameContext } from "../lang/ao_context";

/**
 * DSL Compiler - Uses Ao grammar for expression evaluation
 */
type CompiledExpression = (unit: Unit, context: TickContext) => any;

export class DSLCompiler {
  private cache = new Map<string, CompiledExpression>();

  compile(expression: string): CompiledExpression {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }

    const fn = (unit: Unit, tickContext: TickContext) => {
      const context = this.buildContext(unit, tickContext);

      return Ao.eval(expression, context);
    };

    this.cache.set(expression, fn);
    return fn;
  }

  compileWithCachedUnits(
    expression: string,
    cachedUnits?: readonly Unit[],
  ): CompiledExpression {
    const fn = (unit: Unit, tickContext: TickContext) => {
      const context = createGameContext(unit, tickContext, cachedUnits);
      return Ao.eval(expression, context);
    };
    return fn;
  }

  private buildContext(unit: Unit, tickContext: TickContext): any {
    return createGameContext(unit, tickContext);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const dslCompiler = new DSLCompiler();
