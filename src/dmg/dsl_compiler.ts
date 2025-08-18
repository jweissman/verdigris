import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * A proper DSL compiler that parses expressions into an AST
 * and generates efficient functions that work with arrays directly
 */

// AST Node types
type ASTNode =
  | { type: "literal"; value: any }
  | { type: "identifier"; name: string }
  | { type: "property"; object: ASTNode; property: string }
  | { type: "call"; func: string; args: ASTNode[] }
  | { type: "binary"; op: string; left: ASTNode; right: ASTNode }
  | { type: "unary"; op: string; arg: ASTNode }
  | {
      type: "conditional";
      test: ASTNode;
      consequent: ASTNode;
      alternate: ASTNode;
    }
  | { type: "optional"; object: ASTNode; property: string };

export class DSLCompiler {
  private cache = new Map<string, (unit: Unit, context: TickContext) => any>();

  /**
   * Compile a DSL expression into an efficient function
   */
  compile(expression: string): (unit: Unit, context: TickContext) => any {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }

    const ast = this.parse(expression);
    const fn = this.generate(ast);

    this.cache.set(expression, fn);
    return fn;
  }

  /**
   * Parse DSL expression into AST
   */
  private parse(expr: string): ASTNode {
    const tokens = this.tokenize(expr);
    return this.parseExpression(tokens);
  }

  /**
   * Tokenize the expression
   */
  private tokenize(expr: string): string[] {
    // Simple tokenizer - handles most DSL patterns
    const tokens: string[] = [];
    let current = "";
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      if (inString) {
        current += char;
        if (char === stringChar && expr[i - 1] !== "\\") {
          tokens.push(current);
          current = "";
          inString = false;
        }
      } else if (char === '"' || char === "'") {
        if (current) tokens.push(current);
        current = char;
        inString = true;
        stringChar = char;
      } else if ("()[]{},.?!<>=&|+-*/%".includes(char)) {
        // Special case: don't split decimal numbers
        if (
          char === "." &&
          current &&
          /^\d+$/.test(current) &&
          i + 1 < expr.length &&
          /\d/.test(expr[i + 1])
        ) {
          current += char;
        } else {
          if (current) tokens.push(current);

          // Handle multi-char operators
          if (i + 1 < expr.length) {
            const next = expr[i + 1];
            if (
              (char === "<" || char === ">" || char === "=" || char === "!") &&
              next === "="
            ) {
              tokens.push(char + next);
              i++;
            } else if (
              (char === "&" && next === "&") ||
              (char === "|" && next === "|")
            ) {
              tokens.push(char + next);
              i++;
            } else if (char === "?" && next === ".") {
              tokens.push("?.");
              i++;
            } else {
              tokens.push(char);
            }
          } else {
            tokens.push(char);
          }
          current = "";
        }
      } else if (char === " " || char === "\t" || char === "\n") {
        if (current) tokens.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    if (current) tokens.push(current);
    return tokens;
  }

  /**
   * Parse expression with operator precedence
   */
  private parseExpression(tokens: string[], pos = { i: 0 }): ASTNode {
    return this.parseOr(tokens, pos);
  }

  private parseOr(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parseAnd(tokens, pos);

    while (pos.i < tokens.length && tokens[pos.i] === "||") {
      pos.i++; // consume ||
      const right = this.parseAnd(tokens, pos);
      left = { type: "binary", op: "||", left, right };
    }

    return left;
  }

  private parseAnd(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parseComparison(tokens, pos);

    while (pos.i < tokens.length && tokens[pos.i] === "&&") {
      pos.i++; // consume &&
      const right = this.parseComparison(tokens, pos);
      left = { type: "binary", op: "&&", left, right };
    }

    return left;
  }

  private parseComparison(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parseAdditive(tokens, pos);

    if (pos.i < tokens.length) {
      const op = tokens[pos.i];
      if (["<", ">", "<=", ">=", "==", "!="].includes(op)) {
        pos.i++; // consume operator
        const right = this.parseAdditive(tokens, pos);
        return { type: "binary", op, left, right };
      }
    }

    return left;
  }

  private parseAdditive(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parseMultiplicative(tokens, pos);

    while (pos.i < tokens.length && ["+", "-"].includes(tokens[pos.i])) {
      const op = tokens[pos.i++];
      const right = this.parseMultiplicative(tokens, pos);
      left = { type: "binary", op, left, right };
    }

    return left;
  }

  private parseMultiplicative(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parseUnary(tokens, pos);

    while (pos.i < tokens.length && ["*", "/", "%"].includes(tokens[pos.i])) {
      const op = tokens[pos.i++];
      const right = this.parseUnary(tokens, pos);
      left = { type: "binary", op, left, right };
    }

    return left;
  }

  private parseUnary(tokens: string[], pos: { i: number }): ASTNode {
    if (pos.i < tokens.length && tokens[pos.i] === "!") {
      pos.i++; // consume !
      return { type: "unary", op: "!", arg: this.parseUnary(tokens, pos) };
    }

    return this.parsePostfix(tokens, pos);
  }

  private parsePostfix(tokens: string[], pos: { i: number }): ASTNode {
    let left = this.parsePrimary(tokens, pos);

    while (pos.i < tokens.length) {
      const token = tokens[pos.i];

      if (token === ".") {
        pos.i++; // consume .
        const prop = tokens[pos.i++];

        // Check if it's a method call
        if (pos.i < tokens.length && tokens[pos.i] === "(") {
          pos.i++; // consume (
          const args: ASTNode[] = [];

          while (pos.i < tokens.length && tokens[pos.i] !== ")") {
            args.push(this.parseExpression(tokens, pos));
            if (tokens[pos.i] === ",") pos.i++;
          }

          pos.i++; // consume )
          // Store as method call node
          left = {
            type: "call",
            func: "method",
            args: [left, { type: "literal", value: prop }, ...args],
          };
        } else {
          left = { type: "property", object: left, property: prop };
        }
      } else if (token === "?.") {
        pos.i++; // consume ?.
        const prop = tokens[pos.i++];
        
        // Check if it's an optional method call
        if (pos.i < tokens.length && tokens[pos.i] === "(") {
          pos.i++; // consume (
          const args: ASTNode[] = [];

          while (pos.i < tokens.length && tokens[pos.i] !== ")") {
            args.push(this.parseExpression(tokens, pos));
            if (tokens[pos.i] === ",") pos.i++;
          }

          pos.i++; // consume )
          // Store as optional method call
          left = {
            type: "call",
            func: "optionalMethod",
            args: [left, { type: "literal", value: prop }, ...args],
          };
        } else {
          left = { type: "optional", object: left, property: prop };
        }
      } else if (token === "(") {
        // Function call
        pos.i++; // consume (
        const args: ASTNode[] = [];

        while (pos.i < tokens.length && tokens[pos.i] !== ")") {
          args.push(this.parseExpression(tokens, pos));
          if (tokens[pos.i] === ",") pos.i++;
        }

        pos.i++; // consume )
        left = {
          type: "call",
          func: left.type === "identifier" ? left.name : "direct",
          args,
        };
      } else {
        break;
      }
    }

    return left;
  }

  private parsePrimary(tokens: string[], pos: { i: number }): ASTNode {
    const token = tokens[pos.i++];

    // Literals
    if (token === "true") return { type: "literal", value: true };
    if (token === "false") return { type: "literal", value: false };
    if (token === "null") return { type: "literal", value: null };
    if (token === "undefined") return { type: "literal", value: undefined };

    // Numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      return { type: "literal", value: parseFloat(token) };
    }

    // Strings
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return { type: "literal", value: token.slice(1, -1) };
    }

    // Parenthesized expression
    if (token === "(") {
      const expr = this.parseExpression(tokens, pos);
      pos.i++; // consume )
      return expr;
    }

    // Identifier
    return { type: "identifier", name: token };
  }

  /**
   * Generate optimized function from AST
   */
  private generate(ast: ASTNode): (unit: Unit, context: TickContext) => any {
    // Generate a function that works directly with arrays when possible
    return (unit: Unit, context: TickContext) => {
      return this.evaluate(ast, unit, context);
    };
  }

  /**
   * Evaluate AST node efficiently
   */
  private evaluate(node: ASTNode, unit: Unit, context: TickContext): any {
    switch (node.type) {
      case "literal":
        return node.value;

      case "identifier":
        return this.resolveIdentifier(node.name, unit, context);

      case "property":
        const obj = this.evaluate(node.object, unit, context);
        return obj ? obj[node.property] : undefined;

      case "optional":
        const optObj = this.evaluate(node.object, unit, context);
        return optObj !== null && optObj !== undefined
          ? optObj[node.property]
          : undefined;

      case "call":
        return this.callFunction(node.func, node.args, unit, context);

      case "binary":
        return this.evaluateBinary(
          node.op,
          node.left,
          node.right,
          unit,
          context,
        );

      case "unary":
        const arg = this.evaluate(node.arg, unit, context);
        if (node.op === "!") return !arg;
        return arg;

      default:
        throw new Error(`Unknown node type: ${(node as any).type}`);
    }
  }

  private resolveIdentifier(
    name: string,
    unit: Unit,
    context: TickContext,
  ): any {
    switch (name) {
      case "self":
        return unit;
      case "target":
        return unit; // In trigger context, target is self
      case "closest":
        return this.createClosestHelper(unit, context);
      case "weakest":
        return this.createWeakestHelper(unit, context);
      case "strongest":
        return this.createStrongestHelper(unit, context);
      case "enemies":
        return this.getEnemies(unit, context);
      case "allies":
        return this.getAllies(unit, context);
      default:
        return undefined;
    }
  }

  private callFunction(
    func: string | ASTNode,
    args: ASTNode[],
    unit: Unit,
    context: TickContext,
  ): any {
    if (typeof func === "string") {
      switch (func) {
        case "distance":
          const target = this.evaluate(args[0], unit, context);
          if (!target || target === undefined || target === null)
            return Infinity;
          // Match old DSL behavior exactly
          if ((target as any).id) {
            // It's a unit object
            const dx = target.pos.x - unit.pos.x;
            const dy = target.pos.y - unit.pos.y;
            return Math.sqrt(dx * dx + dy * dy);
          } else {
            // It's a position object
            const pos = target as any;
            if (typeof pos.x !== 'number' || typeof pos.y !== 'number')
              return Infinity;
            return Math.sqrt(
              Math.pow(unit.pos.x - pos.x, 2) +
              Math.pow(unit.pos.y - pos.y, 2),
            );
          }

        case "method":
          // Handle method calls like closest.enemy() or tags.includes()
          const obj = this.evaluate(args[0], unit, context);
          const methodName =
            args[1].type === "literal" ? args[1].value : undefined;
          if (!obj || !methodName) return undefined;

          const method = obj[methodName];
          if (typeof method === "function") {
            const methodArgs = args
              .slice(2)
              .map((a) => this.evaluate(a, unit, context));
            return method.call(obj, ...methodArgs);
          }
          return undefined;

        case "optionalMethod":
          // Handle optional method calls like tags?.includes()
          const optObj = this.evaluate(args[0], unit, context);
          const optMethodName =
            args[1].type === "literal" ? args[1].value : undefined;
          if (!optObj || optObj === null || optObj === undefined || !optMethodName) return undefined;

          const optMethod = optObj[optMethodName];
          if (typeof optMethod === "function") {
            const optMethodArgs = args
              .slice(2)
              .map((a) => this.evaluate(a, unit, context));
            return optMethod.call(optObj, ...optMethodArgs);
          }
          return undefined;

        case "direct":
          // Direct function call
          return undefined;

        default:
          return undefined;
      }
    }
    return undefined;
  }

  private evaluateBinary(
    op: string,
    left: ASTNode,
    right: ASTNode,
    unit: Unit,
    context: TickContext,
  ): any {
    // Short-circuit evaluation for && and ||
    if (op === "&&") {
      const l = this.evaluate(left, unit, context);
      if (!l) return l; // Return the actual falsy value (null, false, etc.)
      return this.evaluate(right, unit, context);
    }

    if (op === "||") {
      const l = this.evaluate(left, unit, context);
      if (l) return l;
      return this.evaluate(right, unit, context);
    }

    // Regular binary operations
    const l = this.evaluate(left, unit, context);
    const r = this.evaluate(right, unit, context);

    switch (op) {
      case "<":
        return l < r;
      case "<=":
        return l <= r;
      case ">":
        return l > r;
      case ">=":
        return l >= r;
      case "==":
        return l === r;
      case "!=":
        return l !== r;
      case "+":
        return l + r;
      case "-":
        return l - r;
      case "*":
        return l * r;
      case "/":
        return l / r;
      case "%":
        return l % r;
      default:
        throw new Error(`Unknown operator: ${op}`);
    }
  }

  /**
   * Helper functions that work directly with arrays for performance
   */
  private createClosestHelper(unit: Unit, context: TickContext) {
    // Cache the actual enemy/ally per unit per tick
    return {
      enemy: () => {
        const cacheKey = `closestEnemy_${unit.id}`;
        if ((context as any)[cacheKey] !== undefined) {
          return (context as any)[cacheKey];
        }
        const result = this.findClosestEnemy(unit, context);
        (context as any)[cacheKey] = result;
        return result;
      },
      ally: () => {
        const cacheKey = `closestAlly_${unit.id}`;
        if ((context as any)[cacheKey] !== undefined) {
          return (context as any)[cacheKey];
        }
        const result = this.findClosestAlly(unit, context);
        (context as any)[cacheKey] = result;
        return result;
      },
    };
  }

  private createWeakestHelper(unit: Unit, context: TickContext) {
    const arrays = (context as any).getArrays?.();
    if (!arrays) {
      return {
        ally: () => this.findWeakestAlly(unit, context),
      };
    }

    return {
      ally: () => {
        const unitIndex = (context as any).getUnitIndex?.(unit.id);
        const unitTeam = arrays.team[unitIndex];

        let weakestIdx = -1;
        let minHp = Infinity;

        for (const idx of arrays.activeIndices) {
          if (
            idx !== unitIndex &&
            arrays.team[idx] === unitTeam &&
            arrays.state[idx] !== 3
          ) {
            if (arrays.hp[idx] < minHp) {
              minHp = arrays.hp[idx];
              weakestIdx = idx;
            }
          }
        }

        return weakestIdx >= 0
          ? (context as any).getUnitProxyByIndex(weakestIdx)
          : null;
      },
    };
  }

  private createStrongestHelper(unit: Unit, context: TickContext) {
    // Similar to weakest but inverted
    return {
      enemy: () => this.findStrongestEnemy(unit, context),
    };
  }

  // Fallback implementations using getAllUnits
  private findClosestEnemy(unit: Unit, context: TickContext): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let closest = null;
    let minDistSq = Infinity;

    for (const u of units) {
      if (
        u.team !== unit.team &&
        u.state !== "dead" &&
        u.state !== 3 &&
        u.hp > 0
      ) {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = u;
        }
      }
    }

    return closest;
  }

  private findClosestAlly(unit: Unit, context: TickContext): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let closest = null;
    let minDistSq = Infinity;

    for (const u of units) {
      if (
        u.team === unit.team &&
        u.id !== unit.id &&
        u.state !== "dead" &&
        u.state !== 3 &&
        u.hp > 0
      ) {
        const dx = u.pos.x - unit.pos.x;
        const dy = u.pos.y - unit.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closest = u;
        }
      }
    }

    return closest;
  }

  private findWeakestAlly(unit: Unit, context: TickContext): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let weakest = null;
    let minHp = Infinity;

    for (const u of units) {
      if (
        u.team === unit.team &&
        u.id !== unit.id &&
        u.state !== "dead" &&
        u.state !== 3 &&
        u.hp > 0
      ) {
        if (u.hp < minHp) {
          minHp = u.hp;
          weakest = u;
        }
      }
    }

    return weakest;
  }

  private findStrongestEnemy(unit: Unit, context: TickContext): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let strongest = null;
    let maxHp = 0;

    for (const u of units) {
      if (
        u.team !== unit.team &&
        u.state !== "dead" &&
        u.state !== 3 &&
        u.hp > 0
      ) {
        if (u.hp > maxHp) {
          maxHp = u.hp;
          strongest = u;
        }
      }
    }

    return strongest;
  }

  private getEnemies(unit: Unit, context: TickContext): Unit[] {
    const units = context.getAllUnits();
    return units.filter((u) => u.team !== unit.team && u.state !== "dead");
  }

  private getAllies(unit: Unit, context: TickContext): Unit[] {
    const units = context.getAllUnits();
    return units.filter(
      (u) => u.team === unit.team && u.id !== unit.id && u.state !== "dead",
    );
  }
}

// Export singleton instance
export const dslCompiler = new DSLCompiler();
