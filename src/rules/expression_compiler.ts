import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * Compiles DSL expressions to native JavaScript functions
 * This is a recursive descent parser that generates JavaScript code
 */
export class ExpressionCompiler {
  private static compiledCache = new Map<string, Function>();

  static compile(expression: string): (unit: Unit, context: TickContext) => any {
    if (this.compiledCache.has(expression)) {
      return this.compiledCache.get(expression) as any;
    }

    try {
      // Parse the expression and generate JavaScript code
      const jsCode = this.parseExpression(expression);
      
      // Create the function with direct array access for maximum performance
      const functionBody = `
        // Access arrays directly for performance
        const arrays = context.getArrays();
        const indices = arrays.activeIndices;
        const unitIndex = context.getUnitIndex(unit.id);
        
        // Unit's position for distance calculations
        const unitX = arrays.posX[unitIndex];
        const unitY = arrays.posY[unitIndex];
        const unitTeam = arrays.team[unitIndex];
        
        // Helper: Find closest enemy using arrays directly
        function closestEnemy() {
          let closestIdx = -1;
          let minDistSq = Infinity;
          
          for (const idx of indices) {
            if (arrays.team[idx] !== unitTeam && arrays.state[idx] !== 3) { // 3 = dead
              const dx = arrays.posX[idx] - unitX;
              const dy = arrays.posY[idx] - unitY;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDistSq) {
                minDistSq = distSq;
                closestIdx = idx;
              }
            }
          }
          
          if (closestIdx === -1) return null;
          
          // Return a lightweight unit object
          return {
            id: arrays.unitIds[closestIdx],
            pos: { x: arrays.posX[closestIdx], y: arrays.posY[closestIdx] },
            hp: arrays.hp[closestIdx],
            maxHp: arrays.maxHp[closestIdx],
            team: arrays.team[closestIdx] === 1 ? 'friendly' : arrays.team[closestIdx] === 2 ? 'hostile' : 'neutral'
          };
        }
        
        // Helper: Find closest ally using arrays directly
        function closestAlly() {
          let closestIdx = -1;
          let minDistSq = Infinity;
          
          for (const idx of indices) {
            if (arrays.team[idx] === unitTeam && arrays.unitIds[idx] !== unit.id && arrays.state[idx] !== 3) {
              const dx = arrays.posX[idx] - unitX;
              const dy = arrays.posY[idx] - unitY;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDistSq) {
                minDistSq = distSq;
                closestIdx = idx;
              }
            }
          }
          
          if (closestIdx === -1) return null;
          
          // Return a lightweight unit object
          return {
            id: arrays.unitIds[closestIdx],
            pos: { x: arrays.posX[closestIdx], y: arrays.posY[closestIdx] },
            hp: arrays.hp[closestIdx],
            maxHp: arrays.maxHp[closestIdx],
            team: arrays.team[closestIdx] === 1 ? 'friendly' : arrays.team[closestIdx] === 2 ? 'hostile' : 'neutral'
          };
        }
        
        // Helper: Calculate distance
        function distance(target) {
          if (!target) return Infinity;
          const t = target.pos || target;
          const dx = t.x - unitX;
          const dy = t.y - unitY;
          return Math.sqrt(dx * dx + dy * dy);
        }
        
        // Execute the compiled expression
        return ${jsCode};
      `;
      
      const fn = new Function('unit', 'context', functionBody);
      this.compiledCache.set(expression, fn);
      return fn as any;
      
    } catch (error) {
      // If compilation fails, return a function that uses DSL.evaluate as fallback
      console.warn(`Failed to compile expression: ${expression}`, error);
      const fallback = (unit: Unit, context: TickContext) => {
        const DSL = require('./dsl').default;
        return DSL.evaluate(expression, unit, context);
      };
      this.compiledCache.set(expression, fallback);
      return fallback;
    }
  }

  /**
   * Parse a DSL expression and return JavaScript code
   */
  private static parseExpression(expr: string): string {
    expr = expr.trim();
    
    // Handle literals
    if (expr === 'true') return 'true';
    if (expr === 'false') return 'false';
    if (expr === 'null') return 'null';
    if (expr === 'undefined') return 'undefined';
    
    // Handle numbers
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return expr;
    }
    
    // Handle strings
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr;
    }
    if (expr.startsWith("'") && expr.endsWith("'")) {
      return expr;
    }
    
    // Handle logical operators (lowest precedence)
    if (expr.includes(' || ')) {
      const parts = this.splitByOperator(expr, ' || ');
      return parts.map(p => this.parseExpression(p)).join(' || ');
    }
    
    if (expr.includes(' && ')) {
      const parts = this.splitByOperator(expr, ' && ');
      return parts.map(p => this.parseExpression(p)).join(' && ');
    }
    
    // Handle comparison operators
    const compOps = [' <= ', ' >= ', ' != ', ' == ', ' < ', ' > '];
    for (const op of compOps) {
      if (expr.includes(op)) {
        const parts = this.splitByOperator(expr, op);
        if (parts.length === 2) {
          const jsOp = op.trim() === '==' ? '===' : 
                      op.trim() === '!=' ? '!==' : 
                      op.trim();
          return `${this.parseExpression(parts[0])} ${jsOp} ${this.parseExpression(parts[1])}`;
        }
      }
    }
    
    // Handle arithmetic operators
    if (expr.includes(' + ')) {
      const parts = this.splitByOperator(expr, ' + ');
      return parts.map(p => this.parseExpression(p)).join(' + ');
    }
    
    if (expr.includes(' - ')) {
      const parts = this.splitByOperator(expr, ' - ');
      return parts.map(p => this.parseExpression(p)).join(' - ');
    }
    
    if (expr.includes(' * ')) {
      const parts = this.splitByOperator(expr, ' * ');
      return parts.map(p => this.parseExpression(p)).join(' * ');
    }
    
    if (expr.includes(' / ')) {
      const parts = this.splitByOperator(expr, ' / ');
      return parts.map(p => this.parseExpression(p)).join(' / ');
    }
    
    // Handle function calls
    if (expr.includes('(')) {
      return this.parseFunctionCall(expr);
    }
    
    // Handle property access
    if (expr.includes('.')) {
      return this.parsePropertyAccess(expr);
    }
    
    // Handle self reference
    if (expr === 'self') {
      return 'unit';
    }
    
    // Handle target reference
    if (expr === 'target') {
      return 'target';
    }
    
    // Default: return as-is (might be a variable)
    return expr;
  }
  
  /**
   * Parse function calls
   */
  private static parseFunctionCall(expr: string): string {
    // Handle distance function
    if (expr.startsWith('distance(')) {
      const inner = this.extractFunctionArgs(expr, 'distance');
      return `distance(${this.parseExpression(inner)})`;
    }
    
    // Handle closest.enemy()
    if (expr === 'closest.enemy()') {
      return 'closestEnemy()';
    }
    
    // Handle closest.ally()
    if (expr === 'closest.ally()') {
      return 'closestAlly()';
    }
    
    // Handle optional chaining like closest.enemy()?.pos
    if (expr.includes('?.')) {
      const parts = expr.split('?.');
      const base = this.parseExpression(parts[0]);
      const props = parts.slice(1).join('?.');
      return `(${base} ? ${base}.${props} : undefined)`;
    }
    
    // Handle method calls on objects
    const methodMatch = expr.match(/^(.+?)\.(\w+)\((.*)\)$/);
    if (methodMatch) {
      const [, obj, method, args] = methodMatch;
      const parsedObj = this.parseExpression(obj);
      const parsedArgs = args ? this.parseArgs(args) : '';
      
      // Special handling for array methods
      if (method === 'includes') {
        return `${parsedObj}?.includes(${parsedArgs})`;
      }
      
      return `${parsedObj}.${method}(${parsedArgs})`;
    }
    
    return expr;
  }
  
  /**
   * Parse property access
   */
  private static parsePropertyAccess(expr: string): string {
    // Handle self.property
    if (expr.startsWith('self.')) {
      const prop = expr.substring(5);
      return `unit.${prop}`;
    }
    
    // Handle closest.enemy() or closest.ally()
    if (expr.startsWith('closest.')) {
      return this.parseFunctionCall(expr);
    }
    
    // Handle chained property access
    const parts = expr.split('.');
    let result = this.parseExpression(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      result += `.${parts[i]}`;
    }
    return result;
  }
  
  /**
   * Extract function arguments
   */
  private static extractFunctionArgs(expr: string, funcName: string): string {
    const start = funcName.length + 1; // After 'funcName('
    let depth = 1;
    let i = start;
    
    while (i < expr.length && depth > 0) {
      if (expr[i] === '(') depth++;
      if (expr[i] === ')') depth--;
      i++;
    }
    
    return expr.substring(start, i - 1);
  }
  
  /**
   * Parse function arguments
   */
  private static parseArgs(args: string): string {
    if (!args.trim()) return '';
    
    const parsed = [];
    const parts = this.splitArgs(args);
    
    for (const part of parts) {
      parsed.push(this.parseExpression(part.trim()));
    }
    
    return parsed.join(', ');
  }
  
  /**
   * Split arguments by comma, respecting parentheses
   */
  private static splitArgs(args: string): string[] {
    const result = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < args.length; i++) {
      const char = args[i];
      if (char === '(' || char === '[') depth++;
      if (char === ')' || char === ']') depth--;
      
      if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current) {
      result.push(current);
    }
    
    return result;
  }
  
  /**
   * Split by operator, respecting parentheses
   */
  private static splitByOperator(expr: string, op: string): string[] {
    const result = [];
    let current = '';
    let depth = 0;
    let i = 0;
    
    while (i < expr.length) {
      if (expr[i] === '(') depth++;
      if (expr[i] === ')') depth--;
      
      if (depth === 0 && expr.substring(i, i + op.length) === op) {
        result.push(current);
        current = '';
        i += op.length;
      } else {
        current += expr[i];
        i++;
      }
    }
    
    if (current) {
      result.push(current);
    }
    
    return result;
  }
}