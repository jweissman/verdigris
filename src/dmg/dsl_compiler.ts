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
  private static sharedHelpers: any = null;
  
  /**
   * Initialize shared helper functions once
   */
  private static initSharedHelpers() {
    if (DSLCompiler.sharedHelpers) return;
    
    // Create shared helper functions that can be reused
    const helperCode = `
      const _findClosestEnemy = (unit, units) => {
        let c = null, m = Infinity;
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team;
        for (let i = 0; i < units.length; i++) {
          const e = units[i];
          if (e.team !== ut && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - ux, dy = e.pos.y - uy;
            const d = dx * dx + dy * dy;
            if (d < m) { m = d; c = e; }
          }
        }
        return c;
      };
      
      const _findClosestAlly = (unit, units) => {
        let c = null, m = Infinity;
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team, uid = unit.id;
        for (let i = 0; i < units.length; i++) {
          const a = units[i];
          if (a.team === ut && a.id !== uid && a.state !== 'dead' && a.hp > 0) {
            const dx = a.pos.x - ux, dy = a.pos.y - uy;
            const d = dx * dx + dy * dy;
            if (d < m) { m = d; c = a; }
          }
        }
        return c;
      };
      
      const _distance = (unit, target) => {
        if (!target) return Infinity;
        const dx = (target.pos ? target.pos.x : target.x) - unit.pos.x;
        const dy = (target.pos ? target.pos.y : target.y) - unit.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
      };
      
      return { _findClosestEnemy, _findClosestAlly, _distance };
    `;
    
    DSLCompiler.sharedHelpers = new Function(helperCode)();
  }

  /**
   * Compile a DSL expression into an efficient function
   */
  compile(expression: string): (unit: Unit, context: TickContext) => any {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }

    const ast = this.parse(expression);
    
    // Try to compile to optimized JS first
    try {
      const fn = this.generateOptimized(ast, expression);
      this.cache.set(expression, fn);
      return fn;
    } catch (e) {
      // Fall back to interpreted AST if compilation fails
      console.warn(`Failed to compile ${expression}, using interpreter:`, e);
      const fn = this.generate(ast);
      this.cache.set(expression, fn);
      return fn;
    }
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
    
    // Array literals
    if (token === "[") {
      const elements: ASTNode[] = [];
      while (pos.i < tokens.length && tokens[pos.i] !== "]") {
        elements.push(this.parseExpression(tokens, pos));
        if (tokens[pos.i] === ",") pos.i++;
      }
      pos.i++; // consume ]
      return { type: "literal", value: elements.map(e => this.evaluateLiteral(e)) };
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
   * Evaluate literal node at parse time
   */
  private evaluateLiteral(node: ASTNode): any {
    if (node.type === "literal") return node.value;
    if (node.type === "identifier") {
      // String literals in arrays
      return node.name;
    }
    return undefined;
  }
  
  /**
   * Generate optimized compiled JavaScript function from AST
   */
  private generateOptimized(ast: ASTNode, expression: string): (unit: Unit, context: TickContext) => any {
    try {
      // For very simple expressions, generate direct code
      if (this.isSimpleExpression(expression)) {
        const jsCode = this.astToDirectJS(ast);
        const functionBody = `return ${jsCode};`;
        return new Function('unit', 'context', functionBody) as any;
      }
      
      // For complex expressions with helpers, use inline code
      const jsCode = this.astToInlineJS(ast);
      const functionBody = `return ${jsCode};`;
      return new Function('unit', 'context', functionBody) as any;
    } catch (e) {
      console.error(`Failed to compile '${expression}':`, e);
      throw new Error(`Failed to compile expression '${expression}': ${e}`);
    }
  }
  
  /**
   * Check if expression is simple enough for direct compilation
   */
  private isSimpleExpression(expression: string): boolean {
    // Simple expressions don't use complex helpers
    return !expression.includes('closest') && 
           !expression.includes('weakest') && 
           !expression.includes('healthiest') && 
           !expression.includes('centroid') &&
           !expression.includes('distance') &&
           !expression.includes('enemies') &&
           !expression.includes('allies') &&
           !expression.includes('pick');
  }
  
  /**
   * Convert AST to direct JavaScript for simple expressions
   */
  private astToDirectJS(node: ASTNode): string {
    switch (node.type) {
      case 'literal':
        return JSON.stringify(node.value);
      
      case 'identifier':
        switch (node.name) {
          case 'self':
          case 'target':
            return 'unit';
          case 'Math':
            return 'Math';
          default:
            return node.name;
        }
      
      case 'property':
        const obj = this.astToDirectJS(node.object);
        return `(${obj}).${node.property}`;
      
      case 'optional':
        const optObj = this.astToDirectJS(node.object);
        return `((${optObj}) || {}).${node.property}`;
      
      case 'binary':
        const left = this.astToDirectJS(node.left);
        const right = this.astToDirectJS(node.right);
        return `(${left} ${node.op} ${right})`;
      
      case 'unary':
        return `${node.op}(${this.astToDirectJS(node.arg)})`;
      
      case 'call':
        // Simple function calls
        if (node.func === 'method' || node.func === 'optionalMethod') {
          const obj = this.astToDirectJS(node.args[0]);
          const method = node.args[1].type === 'literal' ? node.args[1].value : 'unknown';
          const args = node.args.slice(2).map(a => this.astToDirectJS(a)).join(', ');
          if (node.func === 'optionalMethod') {
            return `((${obj}) && (${obj}).${method} ? (${obj}).${method}(${args}) : undefined)`;
          }
          return `(${obj}).${method}(${args})`;
        }
        const args = node.args.map(a => this.astToDirectJS(a)).join(', ');
        return `${node.func}(${args})`;
      
      default:
        throw new Error(`Cannot convert to direct JS: ${(node as any).type}`);
    }
  }
  
  /**
   * Convert AST to inline JavaScript - generate actual code, not helper references
   */
  private astToInlineJS(node: ASTNode): string {
    switch (node.type) {
      case 'literal':
        return JSON.stringify(node.value);
      
      case 'identifier':
        switch (node.name) {
          case 'self':
          case 'target':
            return 'unit';
          case 'Math':
            return 'Math';
          case 'closest':
            // Return an object with inline functions
            return `(() => {
              const units = context.cachedUnits || context.getAllUnits();
              return {
                enemy: () => {
                  let c = null, m = Infinity;
                  for (const e of units) {
                    if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
                      const dx = e.pos.x - unit.pos.x, dy = e.pos.y - unit.pos.y;
                      const d = dx * dx + dy * dy;
                      if (d < m) { m = d; c = e; }
                    }
                  }
                  return c;
                },
                ally: () => {
                  let c = null, m = Infinity;
                  for (const a of units) {
                    if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0) {
                      const dx = a.pos.x - unit.pos.x, dy = a.pos.y - unit.pos.y;
                      const d = dx * dx + dy * dy;
                      if (d < m) { m = d; c = a; }
                    }
                  }
                  return c;
                }
              };
            })()`;
          case 'weakest':
            return `(() => {
              const units = context.cachedUnits || context.getAllUnits();
              return {
                ally: () => {
                  let w = null, minHp = Infinity;
                  for (const a of units) {
                    if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0 && a.hp < minHp) {
                      minHp = a.hp;
                      w = a;
                    }
                  }
                  return w;
                }
              };
            })()`;
          case 'healthiest':
            return `(() => {
              const units = context.cachedUnits || context.getAllUnits();
              return {
                enemy: () => {
                  let h = null, maxHp = 0;
                  for (const e of units) {
                    if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0 && e.hp > maxHp) {
                      maxHp = e.hp;
                      h = e;
                    }
                  }
                  return h;
                },
                enemy_in_range: (range) => {
                  let h = null, maxHp = 0;
                  const rangeSq = range * range;
                  for (const e of units) {
                    if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
                      const dx = e.pos.x - unit.pos.x, dy = e.pos.y - unit.pos.y;
                      const distSq = dx * dx + dy * dy;
                      if (distSq <= rangeSq && e.hp > maxHp) {
                        maxHp = e.hp;
                        h = e;
                      }
                    }
                  }
                  return h;
                }
              };
            })()`;
          case 'enemies':
            return `(context.cachedUnits || context.getAllUnits()).filter(u => u.team !== unit.team && u.state !== 'dead')`;
          case 'allies':
            return `(context.cachedUnits || context.getAllUnits()).filter(u => u.team === unit.team && u.id !== unit.id && u.state !== 'dead')`;
          case 'centroid':
            return `(() => {
              const units = context.cachedUnits || context.getAllUnits();
              const allies = units.filter(u => u.team === unit.team && u.id !== unit.id && u.state !== 'dead');
              const enemies = units.filter(u => u.team !== unit.team && u.state !== 'dead');
              const woundedAllies = allies.filter(u => u.hp < u.maxHp);
              
              return {
                wounded_allies: () => {
                  if (woundedAllies.length === 0) return null;
                  const x = woundedAllies.reduce((sum, u) => sum + u.pos.x, 0) / woundedAllies.length;
                  const y = woundedAllies.reduce((sum, u) => sum + u.pos.y, 0) / woundedAllies.length;
                  return { x: Math.round(x), y: Math.round(y) };
                },
                allies: () => {
                  if (allies.length === 0) return null;
                  const x = allies.reduce((sum, u) => sum + u.pos.x, 0) / allies.length;
                  const y = allies.reduce((sum, u) => sum + u.pos.y, 0) / allies.length;
                  return { x: Math.round(x), y: Math.round(y) };
                },
                enemies: () => {
                  if (enemies.length === 0) return null;
                  const x = enemies.reduce((sum, u) => sum + u.pos.x, 0) / enemies.length;
                  const y = enemies.reduce((sum, u) => sum + u.pos.y, 0) / enemies.length;
                  return { x: Math.round(x), y: Math.round(y) };
                }
              };
            })()`;
          default:
            return node.name;
        }
      
      case 'property':
        const obj = this.astToInlineJS(node.object);
        return `(${obj}).${node.property}`;
      
      case 'optional':
        const optObj = this.astToInlineJS(node.object);
        return `((${optObj}) || {}).${node.property}`;
      
      case 'call':
        if (node.func === 'distance') {
          const target = this.astToInlineJS(node.args[0]);
          return `((t) => {
            if (!t) return Infinity;
            const dx = (t.pos ? t.pos.x : t.x) - unit.pos.x;
            const dy = (t.pos ? t.pos.y : t.y) - unit.pos.y;
            return Math.sqrt(dx * dx + dy * dy);
          })(${target})`;
        }
        if (node.func === 'pick') {
          const arr = this.astToInlineJS(node.args[0]);
          return `((arr) => arr[Math.floor((context.getRandom ? context.getRandom() : Math.random()) * arr.length)])(${arr})`;
        }
        // Handle method calls
        if (node.func === 'method' || node.func === 'optionalMethod') {
          const obj = this.astToInlineJS(node.args[0]);
          const method = node.args[1].type === 'literal' ? node.args[1].value : 'unknown';
          const args = node.args.slice(2).map(a => this.astToInlineJS(a)).join(', ');
          if (node.func === 'optionalMethod') {
            return `((${obj}) && (${obj}).${method} ? (${obj}).${method}(${args}) : undefined)`;
          }
          return `(${obj}).${method}(${args})`;
        }
        // Other function calls
        const args = node.args.map(a => this.astToInlineJS(a)).join(', ');
        return `${node.func}(${args})`;
      
      case 'binary':
        const left = this.astToInlineJS(node.left);
        const right = this.astToInlineJS(node.right);
        return `(${left} ${node.op} ${right})`;
      
      case 'unary':
        return `${node.op}(${this.astToInlineJS(node.arg)})`;
      
      default:
        throw new Error(`Cannot convert AST node to inline JS: ${(node as any).type}`);
    }
  }
  
  /**
   * Convert AST to simple inline JavaScript - no helper functions
   */
  private astToSimpleJS(node: ASTNode): string {
    switch (node.type) {
      case 'literal':
        return JSON.stringify(node.value);
      
      case 'identifier':
        switch (node.name) {
          case 'self':
          case 'target':
            return 'unit';
          case 'true':
            return 'true';
          case 'false':
            return 'false';
          case 'Math':
            return 'Math';
          default:
            // For anything complex, use the full astToJS
            return this.astToJS(node);
        }
      
      case 'property':
        const obj = this.astToSimpleJS(node.object);
        return `(${obj}).${node.property}`;
      
      case 'optional':
        const optObj = this.astToSimpleJS(node.object);
        return `((${optObj}) || {}).${node.property}`;
      
      case 'binary':
        const left = this.astToSimpleJS(node.left);
        const right = this.astToSimpleJS(node.right);
        return `(${left} ${node.op} ${right})`;
      
      case 'unary':
        return `${node.op}(${this.astToSimpleJS(node.arg)})`;
      
      case 'call':
        // For complex function calls, use the full astToJS
        return this.astToJS(node);
      
      default:
        return this.astToJS(node);
    }
  }
  
  /**
   * Convert AST to JavaScript code string
   */
  private astToJS(node: ASTNode): string {
    switch (node.type) {
      case 'literal':
        return JSON.stringify(node.value);
      
      case 'identifier':
        switch (node.name) {
          case 'self':
          case 'target':
            return 'unit';
          case 'closest':
            return '{ enemy: _findClosestEnemy, ally: _findClosestAlly }';
          case 'weakest':
            return '{ ally: _findWeakestAlly }';
          case 'strongest':
            return '{ enemy: _findStrongestEnemy }';
          case 'healthiest':
            return '{ enemy: _findHealthiestEnemy, enemy_in_range: _findHealthiestEnemyInRange }';
          case 'centroid':
            return '{ wounded_allies: _centroidWoundedAllies, allies: _centroidAllies, enemies: _centroidEnemies }';
          case 'Math':
            return 'Math';
          case 'enemies':
            return '_units().filter(u => u.team !== unit.team && u.state !== "dead")';
          case 'allies':
            return '_units().filter(u => u.team === unit.team && u.id !== unit.id && u.state !== "dead")';
          default:
            return node.name;
        }
      
      case 'property':
        const obj = this.astToJS(node.object);
        return `(${obj}).${node.property}`;
      
      case 'optional':
        const optObj = this.astToJS(node.object);
        return `((${optObj}) || {}).${node.property}`;
      
      case 'call':
        if (node.func === 'distance') {
          return `_distance(${this.astToJS(node.args[0])})`;
        }
        if (node.func === 'pick') {
          const arrArg = node.args[0];
          if (arrArg.type === 'literal' && Array.isArray(arrArg.value)) {
            return `_pick(${JSON.stringify(arrArg.value)})`;
          }
          return `_pick(${this.astToJS(arrArg)})`;
        }
        if (node.func === 'method') {
          const obj = this.astToJS(node.args[0]);
          const method = node.args[1].type === 'literal' ? node.args[1].value : 'unknown';
          const args = node.args.slice(2).map(a => this.astToJS(a)).join(', ');
          return `(${obj}).${method}(${args})`;
        }
        if (node.func === 'optionalMethod') {
          const obj = this.astToJS(node.args[0]);
          const method = node.args[1].type === 'literal' ? node.args[1].value : 'unknown';
          const args = node.args.slice(2).map(a => this.astToJS(a)).join(', ');
          // Safe optional method call
          return `((${obj}) && (${obj}).${method} ? (${obj}).${method}(${args}) : undefined)`;
        }
        // Default function call
        const args = node.args.map(a => this.astToJS(a)).join(', ');
        if (typeof node.func === 'string') {
          return `${node.func}(${args})`;
        }
        return `(${this.astToJS(node.func)})(${args})`;
      
      case 'binary':
        const left = this.astToJS(node.left);
        const right = this.astToJS(node.right);
        return `(${left} ${node.op} ${right})`;
      
      case 'unary':
        return `${node.op}(${this.astToJS(node.arg)})`;
      
      case 'conditional':
        return `(${this.astToJS(node.test)} ? ${this.astToJS(node.consequent)} : ${this.astToJS(node.alternate)})`;
      
      default:
        throw new Error(`Cannot convert AST node to JS: ${(node as any).type}`);
    }
  }
  
  /**
   * Generate interpreted function from AST (fallback)
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
      case "healthiest":
        return this.createHealthiestHelper(unit, context);
      case "Math":
        return Math;
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
        case "pick":
          const arr = this.evaluate(args[0], unit, context);
          if (!Array.isArray(arr)) return undefined;
          const idx = Math.floor(context.getRandom() * arr.length);
          return arr[idx];
          
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
  
  private createHealthiestHelper(unit: Unit, context: TickContext) {
    return {
      enemy: () => this.findHealthiestEnemy(unit, context),
      enemy_in_range: (range: number) => this.findHealthiestEnemyInRange(unit, context, range),
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
  
  private findHealthiestEnemy(unit: Unit, context: TickContext): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let healthiest = null;
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
          healthiest = u;
        }
      }
    }

    return healthiest;
  }

  private findHealthiestEnemyInRange(unit: Unit, context: TickContext, range: number): Unit | null {
    const units = (context as any).cachedUnits || context.getAllUnits();
    let healthiest = null;
    let maxHp = 0;
    const rangeSq = range * range;

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
        if (distSq <= rangeSq && u.hp > maxHp) {
          maxHp = u.hp;
          healthiest = u;
        }
      }
    }

    return healthiest;
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
