import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

/**
 * DSL compiler that transforms expressions directly to JavaScript functions
 * Simple transformation: 'hp > 5' becomes (u) => u.hp > 5
 * One clean path, compositional and extensional
 */
export class DSLCompiler {
  private cache = new Map<string, (unit: Unit, context: TickContext) => any>();

  /**
   * Compile a DSL expression into an efficient function
   */
  compile(expression: string): (unit: Unit, context: TickContext) => any {
    if (this.cache.has(expression)) {
      return this.cache.get(expression)!;
    }

    try {
      const fn = this.compileExpression(expression);
      this.cache.set(expression, fn);
      return fn;
    } catch (e) {
      console.error(`Failed to compile '${expression}':`, e);
      // Return a function that always returns false on error
      const fallback = () => false;
      this.cache.set(expression, fallback);
      return fallback;
    }
  }

  /**
   * Compile expression directly to JavaScript function
   * Simple transformation with helper injection only when needed
   */
  private compileExpression(expression: string): (unit: Unit, context: TickContext) => any {
    // Optimize common distance checks without parsing
    if (this.isDistanceCheck(expression)) {
      return this.compileDistanceCheck(expression);
    }
    
    // Start with simple text replacement
    let js = expression
      .replace(/\bself\b/g, 'unit')
      .replace(/\btarget\b/g, 'unit');
    
    // Build helper code only for what's needed
    let helperCode = '';
    
    // Add helpers only if needed - check once, generate once
    if (js.includes('closest.enemy()')) {
      helperCode += this.getClosestEnemyHelper();
      js = js.replace(/closest\.enemy\(\)/g, '_closestEnemy()');
    }
    
    if (js.includes('closest.ally()')) {
      helperCode += this.getClosestAllyHelper();
      js = js.replace(/closest\.ally\(\)/g, '_closestAlly()');
    }
    
    // Handle edge case where 'closest' is used without method call (for tests)
    if (js === 'closest') {
      helperCode += this.getClosestEnemyHelper() + this.getClosestAllyHelper();
      js = '{ enemy: _closestEnemy, ally: _closestAlly }';
    }
    
    if (js.includes('distance(')) {
      helperCode += this.getDistanceHelper();
    }
    
    if (js.includes('weakest.ally()')) {
      helperCode += this.getWeakestAllyHelper();
      js = js.replace(/weakest\.ally\(\)/g, '_weakestAlly()');
    }
    
    if (js.includes('healthiest.enemy')) {
      if (js.includes('healthiest.enemy()')) {
        helperCode += this.getHealthiestEnemyHelper();
        js = js.replace(/healthiest\.enemy\(\)/g, '_healthiestEnemy()');
      }
      if (js.includes('healthiest.enemy_in_range')) {
        // Extract range and create specialized function
        const match = js.match(/healthiest\.enemy_in_range\((\d+)\)/);
        if (match) {
          const range = match[1];
          helperCode += this.getHealthiestEnemyInRangeHelper(range);
          js = js.replace(/healthiest\.enemy_in_range\(\d+\)/g, '_healthiestEnemyInRange()');
        }
      }
    }
    
    // Check for centroid first as it defines allies and enemies
    const hasCentroid = js.includes('centroid.');
    
    if (hasCentroid) {
      helperCode += this.getCentroidHelper();
    }
    
    // Only add standalone helpers if centroid isn't already defining them
    if (js.includes('enemies()') && !hasCentroid) {
      helperCode += `
        const enemies = () => (context.cachedUnits || context.getAllUnits()).filter(u => u.team !== unit.team && u.state !== 'dead');`;
    }
    
    if (js.includes('allies()') && !hasCentroid) {
      helperCode += `
        const allies = () => (context.cachedUnits || context.getAllUnits()).filter(u => u.team === unit.team && u.id !== unit.id && u.state !== 'dead');`;
    }
    
    if (js.includes('pick(')) {
      helperCode += `
        const pick = (array) => array[Math.floor(context.getRandom() * array.length)];`;
    }
    
    if (js.includes('randomPos(')) {
      helperCode += `
        const randomPos = (centerX, centerY, range) => ({
          x: centerX + (context.getRandom() - 0.5) * 2 * range,
          y: centerY + (context.getRandom() - 0.5) * 2 * range
        });`;
    }
    
    // Generate the function with minimal overhead
    const functionBody = helperCode + `
      return ${js};`;
    return new Function('unit', 'context', functionBody) as any;
  }
  
  /**
   * Check if expression is a distance check that can be optimized
   */
  private isDistanceCheck(expression: string): boolean {
    return /^distance\(closest\.enemy\(\)\?\.pos\)\s*[<>=]+\s*\d+$/.test(expression);
  }
  
  /**
   * Compile optimized distance check - avoid finding closest enemy if we just need to check range
   */
  private compileDistanceCheck(expression: string): (unit: Unit, context: TickContext) => any {
    const match = expression.match(/^distance\(closest\.enemy\(\)\?\.pos\)\s*([<>=]+)\s*(\d+)$/);
    if (!match) throw new Error('Invalid distance expression');
    
    const op = match[1];
    const range = parseInt(match[2]);
    const rangeSq = range * range;
    
    if (op === '<=' || op === '<') {
      const checkOp = op === '<=' ? '<=' : '<';
      return new Function('unit', 'context', `
        // Use pre-computed distance if available
        if (context.precomputedEnemyDistance !== undefined) {
          return context.precomputedEnemyDistance ${op} ${range};
        }
        // Fall back to computing
        const units = context.cachedUnits || context.getAllUnits();
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team;
        const rangeSq = ${rangeSq};
        for (const e of units) {
          if (e.team !== ut && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - ux, dy = e.pos.y - uy;
            if (dx * dx + dy * dy ${checkOp} rangeSq) return true;
          }
        }
        return false;
      `) as any;
    }
    
    // For > and >= operators - check if NO enemy is within range
    if (op === '>' || op === '>=') {
      const checkOp = op === '>' ? '<=' : '<';
      return new Function('unit', 'context', `
        // Use pre-computed distance if available
        if (context.precomputedEnemyDistance !== undefined) {
          return context.precomputedEnemyDistance ${op} ${range};
        }
        // Fall back to computing
        const units = context.cachedUnits || context.getAllUnits();
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team;
        const rangeSq = ${rangeSq};
        for (const e of units) {
          if (e.team !== ut && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - ux, dy = e.pos.y - uy;
            if (dx * dx + dy * dy ${checkOp} rangeSq) return false;
          }
        }
        return true;
      `) as any;
    }
    
    throw new Error(`Unsupported distance operator: ${op}`);
  }
  
  // Minimal helper generators - each returns just the code needed
  private getClosestEnemyHelper(): string {
    return `
      const _closestEnemy = () => {
        const units = context.cachedUnits || context.getAllUnits();
        let c = null, m = Infinity;
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team;
        for (const e of units) {
          if (e.team !== ut && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - ux, dy = e.pos.y - uy;
            const d = dx * dx + dy * dy;
            if (d < m) { m = d; c = e; }
          }
        }
        return c;
      };`;
  }
  
  private getClosestAllyHelper(): string {
    return `
      const _closestAlly = () => {
        const units = context.cachedUnits || context.getAllUnits();
        let c = null, m = Infinity;
        const ux = unit.pos.x, uy = unit.pos.y, ut = unit.team, uid = unit.id;
        for (const a of units) {
          if (a.team === ut && a.id !== uid && a.state !== 'dead' && a.hp > 0) {
            const dx = a.pos.x - ux, dy = a.pos.y - uy;
            const d = dx * dx + dy * dy;
            if (d < m) { m = d; c = a; }
          }
        }
        return c;
      };`;
  }
  
  private getDistanceHelper(): string {
    return `
      const distance = (target) => {
        if (!target) return Infinity;
        const dx = (target.pos ? target.pos.x : target.x) - unit.pos.x;
        const dy = (target.pos ? target.pos.y : target.y) - unit.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
      };`;
  }
  
  private getWeakestAllyHelper(): string {
    return `
      const _weakestAlly = () => {
        const units = context.cachedUnits || context.getAllUnits();
        let w = null, minHp = Infinity;
        for (const a of units) {
          if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0 && a.hp < minHp) {
            minHp = a.hp;
            w = a;
          }
        }
        return w;
      };`;
  }
  
  private getHealthiestEnemyHelper(): string {
    return `
      const _healthiestEnemy = () => {
        const units = context.cachedUnits || context.getAllUnits();
        let h = null, maxHp = 0;
        for (const e of units) {
          if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0 && e.hp > maxHp) {
            maxHp = e.hp;
            h = e;
          }
        }
        return h;
      };`;
  }
  
  private getHealthiestEnemyInRangeHelper(range: string): string {
    return `
      const _healthiestEnemyInRange = () => {
        const units = context.cachedUnits || context.getAllUnits();
        let h = null, maxHp = 0;
        const rangeSq = ${range} * ${range};
        for (const e of units) {
          if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
            const dx = e.pos.x - unit.pos.x, dy = e.pos.y - unit.pos.y;
            if (dx * dx + dy * dy <= rangeSq && e.hp > maxHp) {
              maxHp = e.hp;
              h = e;
            }
          }
        }
        return h;
      };`;
  }
  
  private getCentroidHelper(): string {
    return `
      const units = context.cachedUnits || context.getAllUnits();
      const allies = units.filter(u => u.team === unit.team && u.id !== unit.id && u.state !== 'dead');
      const enemies = units.filter(u => u.team !== unit.team && u.state !== 'dead');
      const woundedAllies = allies.filter(u => u.hp < u.maxHp);
      
      const centroid = {
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
      };`;
  }
  
  clearCache() {
    this.cache.clear();
  }
}

export const dslCompiler = new DSLCompiler();