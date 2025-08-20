import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * DSL Compiler - Simple recursive descent parser, no dependencies
 * Isomorphic, clean, extensible
 */
type CompiledExpression = (unit: Unit, context: TickContext) => any;

export class DSLCompiler {
  private cache = new Map<string, CompiledExpression>();

  compile(expression: string): CompiledExpression {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }

    const fn = (unit: Unit, context: TickContext) => {
      const parser = new ExpressionParser(expression, unit, context);
      return parser.parse();
    };
    
    this.cache.set(expression, fn);
    return fn;
  }

  clearCache() {
    this.cache.clear();
  }
}

/**
 * Simple recursive descent parser for DSL expressions
 */
class ExpressionParser {
  private pos = 0;
  private expr: string;
  private unit: Unit;
  private context: TickContext;
  
  constructor(expr: string, unit: Unit, context: TickContext) {
    this.expr = expr.trim();
    this.unit = unit;
    this.context = context;
  }
  
  parse(): any {
    const result = this.parseOr();
    if (this.pos < this.expr.length) {
      throw new Error(`Unexpected characters at position ${this.pos}: ${this.expr.substring(this.pos)}`);
    }
    return result;
  }
  
  private parseOr(): any {
    let left = this.parseAnd();
    while (this.consumeOp('||')) {
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }
  
  private parseAnd(): any {
    let left = this.parseEquality();
    while (this.consumeOp('&&')) {
      const right = this.parseEquality();
      left = left && right;
    }
    return left;
  }
  
  private parseEquality(): any {
    let left = this.parseRelational();
    if (this.consumeOp('==')) {
      return left == this.parseRelational();
    }
    if (this.consumeOp('!=')) {
      return left != this.parseRelational();
    }
    return left;
  }
  
  private parseRelational(): any {
    let left = this.parseAdditive();
    if (this.consumeOp('>=')) {
      return left >= this.parseAdditive();
    }
    if (this.consumeOp('<=')) {
      return left <= this.parseAdditive();
    }
    if (this.consumeOp('>')) {
      return left > this.parseAdditive();
    }
    if (this.consumeOp('<')) {
      return left < this.parseAdditive();
    }
    return left;
  }
  
  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (true) {
      if (this.consumeOp('+')) {
        left = left + this.parseMultiplicative();
      } else if (this.consumeOp('-')) {
        left = left - this.parseMultiplicative();
      } else {
        break;
      }
    }
    return left;
  }
  
  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (true) {
      if (this.consumeOp('*')) {
        left = left * this.parseUnary();
      } else if (this.consumeOp('/')) {
        left = left / this.parseUnary();
      } else {
        break;
      }
    }
    return left;
  }
  
  private parseUnary(): any {
    if (this.consumeOp('-')) {
      return -this.parseUnary();
    }
    if (this.consumeOp('!')) {
      return !this.parseUnary();
    }
    return this.parsePostfix();
  }
  
  private parsePostfix(): any {
    let left = this.parsePrimary();
    
    while (true) {
      this.skipWhitespace();
      
      // Check for member access first to build the chain
      if (this.peek(2) === '?.') {
        // Optional chaining
        this.pos += 2;
        const prop = this.parseIdentifier();
        
        // Check if next is a function call
        this.skipWhitespace();
        if (this.peek() === '(') {
          // It's a method call
          this.pos++;
          const args: any[] = [];
          this.skipWhitespace();
          
          if (this.peek() !== ')') {
            args.push(this.parseOr());
            while (this.consume(',')) {
              args.push(this.parseOr());
            }
          }
          
          if (!this.consume(')')) {
            throw new Error(`Expected ) at position ${this.pos}`);
          }
          
          if (left == null) {
            left = undefined;
          } else {
            const method = left[prop];
            if (typeof method === 'function') {
              left = method.apply(left, args);
            } else {
              left = undefined;
            }
          }
        } else {
          // It's a property access
          left = left == null ? undefined : left[prop];
        }
      }
      else if (this.peek() === '.') {
        // Regular member access
        this.pos++;
        const prop = this.parseIdentifier();
        
        // Check if next is a function call
        this.skipWhitespace();
        if (this.peek() === '(') {
          // It's a method call
          this.pos++;
          const args: any[] = [];
          this.skipWhitespace();
          
          if (this.peek() !== ')') {
            args.push(this.parseOr());
            while (this.consume(',')) {
              args.push(this.parseOr());
            }
          }
          
          if (!this.consume(')')) {
            throw new Error(`Expected ) at position ${this.pos}`);
          }
          
          if (left == null) {
            throw new Error(`Cannot call method ${prop} on null/undefined`);
          }
          const method = left[prop];
          if (typeof method === 'function') {
            left = method.apply(left, args);
          } else {
            throw new Error(`${prop} is not a function`);
          }
        } else {
          // It's a property access
          left = left == null ? undefined : left[prop];
        }
      }
      else if (this.peek() === '(') {
        // Direct function call
        this.pos++;
        const args: any[] = [];
        this.skipWhitespace();
        
        if (this.peek() !== ')') {
          args.push(this.parseOr());
          while (this.consume(',')) {
            args.push(this.parseOr());
          }
        }
        
        if (!this.consume(')')) {
          throw new Error(`Expected ) at position ${this.pos}`);
        }
        
        if (typeof left !== 'function') {
          throw new Error(`Not a function at position ${this.pos}`);
        }
        left = left(...args);
      }
      else {
        break;
      }
    }
    
    return left;
  }
  
  private parsePrimary(): any {
    this.skipWhitespace();
    
    // Array literal
    if (this.peek() === '[') {
      this.pos++;
      const elements: any[] = [];
      this.skipWhitespace();
      
      if (this.peek() !== ']') {
        elements.push(this.parseOr());
        while (this.consume(',')) {
          elements.push(this.parseOr());
        }
      }
      
      if (!this.consume(']')) {
        throw new Error(`Expected ] at position ${this.pos}`);
      }
      return elements;
    }
    
    // Parenthesized expression
    if (this.peek() === '(') {
      this.pos++;
      const expr = this.parseOr();
      if (!this.consume(')')) {
        throw new Error(`Expected ) at position ${this.pos}`);
      }
      return expr;
    }
    
    // Number
    if (/\d/.test(this.peek())) {
      return this.parseNumber();
    }
    
    // String
    if (this.peek() === '"' || this.peek() === "'") {
      return this.parseString();
    }
    
    // Boolean/null/identifier
    const id = this.parseIdentifier();
    if (id === 'true') return true;
    if (id === 'false') return false;
    if (id === 'null') return null;
    if (id === 'undefined') return undefined;
    
    // Look up in context
    return this.resolveIdentifier(id);
  }
  
  private parseNumber(): number {
    let numStr = '';
    while (this.pos < this.expr.length && /[\d.]/.test(this.expr[this.pos])) {
      numStr += this.expr[this.pos++];
    }
    return parseFloat(numStr);
  }
  
  private parseString(): string {
    const quote = this.expr[this.pos++];
    let str = '';
    while (this.pos < this.expr.length && this.expr[this.pos] !== quote) {
      if (this.expr[this.pos] === '\\' && this.pos + 1 < this.expr.length) {
        this.pos++; // Skip escape char
      }
      str += this.expr[this.pos++];
    }
    this.pos++; // Skip closing quote
    return str;
  }
  
  private parseIdentifier(): string {
    this.skipWhitespace();
    let id = '';
    while (this.pos < this.expr.length && /[a-zA-Z0-9_]/.test(this.expr[this.pos])) {
      id += this.expr[this.pos++];
    }
    return id;
  }
  
  private resolveIdentifier(id: string): any {
    // Built-in identifiers
    if (id === 'self' || id === 'unit') return this.unit;
    if (id === 'target') return this.unit; // Default, should be overridden
    
    // Math functions
    if (id === 'Math') return Math;
    
    // Built-in functions
    if (id === 'distance') return this.createDistanceFunction();
    if (id === 'closest') return this.createClosestObject();
    if (id === 'count') return this.createCountObject();
    if (id === 'weakest') return this.createWeakestObject();
    if (id === 'healthiest') return this.createHealthiestObject();
    if (id === 'centroid') return this.createCentroidObject();
    if (id === 'pick') return this.createPickFunction();
    if (id === 'randomPos') return this.createRandomPosFunction();
    
    // Unit properties
    if (this.unit && id in this.unit) {
      return (this.unit as any)[id];
    }
    
    return undefined;
  }
  
  private createDistanceFunction() {
    return (target: any) => {
      if (!target) return Infinity;
      const pos = target.pos || target;
      const dx = pos.x - this.unit.pos.x;
      const dy = pos.y - this.unit.pos.y;
      return Math.sqrt(dx * dx + dy * dy);
    };
  }
  
  private createClosestObject() {
    return {
      enemy: () => {
        const units = this.context.getAllUnits();
        let closest = null, minDist = Infinity;
        for (const e of units) {
          if (e.team !== this.unit.team && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - this.unit.pos.x;
            const dy = e.pos.y - this.unit.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDist) {
              minDist = distSq;
              closest = e;
            }
          }
        }
        return closest;
      },
      ally: () => {
        const units = this.context.getAllUnits();
        let closest = null, minDist = Infinity;
        for (const a of units) {
          if (a.team === this.unit.team && a.id !== this.unit.id && a.state !== 'dead' && a.hp > 0) {
            const dx = a.pos.x - this.unit.pos.x;
            const dy = a.pos.y - this.unit.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDist) {
              minDist = distSq;
              closest = a;
            }
          }
        }
        return closest;
      }
    };
  }
  
  private createCountObject() {
    return {
      enemies_in_range: (range: number) => {
        const units = this.context.getAllUnits();
        const rangeSq = range * range;
        let count = 0;
        for (const e of units) {
          if (e.team !== this.unit.team && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - this.unit.pos.x;
            const dy = e.pos.y - this.unit.pos.y;
            if (dx * dx + dy * dy <= rangeSq) count++;
          }
        }
        return count;
      }
    };
  }
  
  private createWeakestObject() {
    return {
      ally: () => {
        const units = this.context.getAllUnits();
        let weakest = null, minHp = Infinity;
        for (const a of units) {
          if (a.team === this.unit.team && a.id !== this.unit.id && a.state !== 'dead' && a.hp > 0 && a.hp < minHp) {
            minHp = a.hp;
            weakest = a;
          }
        }
        return weakest;
      }
    };
  }
  
  private createHealthiestObject() {
    return {
      enemy: () => {
        const units = this.context.getAllUnits();
        let healthiest = null, maxHp = 0;
        for (const e of units) {
          if (e.team !== this.unit.team && e.state !== 'dead' && e.hp > 0 && e.hp > maxHp) {
            maxHp = e.hp;
            healthiest = e;
          }
        }
        return healthiest;
      },
      enemy_in_range: (range: number) => {
        const units = this.context.getAllUnits();
        let healthiest = null, maxHp = 0;
        const rangeSq = range * range;
        for (const e of units) {
          if (e.team !== this.unit.team && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - this.unit.pos.x;
            const dy = e.pos.y - this.unit.pos.y;
            if (dx * dx + dy * dy <= rangeSq && e.hp > maxHp) {
              maxHp = e.hp;
              healthiest = e;
            }
          }
        }
        return healthiest;
      }
    };
  }
  
  private createCentroidObject() {
    return {
      wounded_allies: () => {
        const units = this.context.getAllUnits();
        const wounded = units.filter((u: Unit) => 
          u.team === this.unit.team && u.id !== this.unit.id && 
          u.state !== 'dead' && u.hp < u.maxHp
        );
        if (wounded.length === 0) return null;
        const x = wounded.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / wounded.length;
        const y = wounded.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / wounded.length;
        return { x: Math.round(x), y: Math.round(y) };
      },
      allies: () => {
        const units = this.context.getAllUnits();
        const allies = units.filter((u: Unit) => 
          u.team === this.unit.team && u.id !== this.unit.id && u.state !== 'dead'
        );
        if (allies.length === 0) return null;
        const x = allies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / allies.length;
        const y = allies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / allies.length;
        return { x: Math.round(x), y: Math.round(y) };
      },
      enemies: () => {
        const units = this.context.getAllUnits();
        const enemies = units.filter((u: Unit) => u.team !== this.unit.team && u.state !== 'dead');
        if (enemies.length === 0) return null;
        const x = enemies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / enemies.length;
        const y = enemies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / enemies.length;
        return { x: Math.round(x), y: Math.round(y) };
      }
    };
  }
  
  private createPickFunction() {
    return (array: any[]) => array[Math.floor(this.context.getRandom() * array.length)];
  }
  
  private createRandomPosFunction() {
    return (centerX: number, centerY: number, range: number) => ({
      x: centerX + (this.context.getRandom() - 0.5) * 2 * range,
      y: centerY + (this.context.getRandom() - 0.5) * 2 * range
    });
  }
  
  private skipWhitespace() {
    while (this.pos < this.expr.length && /\s/.test(this.expr[this.pos])) {
      this.pos++;
    }
  }
  
  private peek(n: number = 1): string {
    if (n === 1) {
      return this.pos < this.expr.length ? this.expr[this.pos] : '';
    }
    return this.expr.substring(this.pos, this.pos + n);
  }
  
  private consume(char: string): boolean {
    this.skipWhitespace();
    if (this.pos < this.expr.length && this.expr[this.pos] === char) {
      this.pos++;
      return true;
    }
    return false;
  }
  
  private consumeOp(op: string): boolean {
    this.skipWhitespace();
    if (this.expr.substring(this.pos, this.pos + op.length) === op) {
      // Check it's not part of a longer operator
      const nextChar = this.expr[this.pos + op.length] || '';
      if (op.match(/[<>=!]/) && nextChar === '=') {
        return false; // Don't consume partial operators
      }
      this.pos += op.length;
      return true;
    }
    return false;
  }
}

export const dslCompiler = new DSLCompiler();