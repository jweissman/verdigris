import type { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import { Ao } from '../lang/ao';

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
      // Build context object with all the DSL functions and variables
      const context = this.buildContext(unit, tickContext);
      
      // Evaluate expression using Ao
      return Ao.eval(expression, context);
    };
    
    this.cache.set(expression, fn);
    return fn;
  }

  private buildContext(unit: Unit, tickContext: TickContext): any {
    const units = tickContext.getAllUnits();
    
    return {
      // Unit references
      self: unit,
      unit: unit,
      target: unit, // Default, should be overridden
      
      // Math object
      Math: Math,
      
      // Unit properties
      ...unit,
      
      // Distance function
      distance: (target: any) => {
        if (!target) return Infinity;
        const pos = target.pos || target;
        const dx = pos.x - unit.pos.x;
        const dy = pos.y - unit.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
      },
      
      // Closest object
      closest: {
        enemy: () => {
          let closest = null, minDist = Infinity;
          for (const e of units) {
            if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
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
          let closest = null, minDist = Infinity;
          for (const a of units) {
            if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0) {
              const dx = a.pos.x - unit.pos.x;
              const dy = a.pos.y - unit.pos.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < minDist) {
                minDist = distSq;
                closest = a;
              }
            }
          }
          return closest;
        }
      },
      
      // Count object
      count: {
        enemies_in_range: (range: number) => {
          const rangeSq = range * range;
          let count = 0;
          for (const e of units) {
            if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
              if (dx * dx + dy * dy <= rangeSq) count++;
            }
          }
          return count;
        }
      },
      
      // Weakest object
      weakest: {
        ally: () => {
          let weakest = null, minHp = Infinity;
          for (const a of units) {
            if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0 && a.hp < minHp) {
              minHp = a.hp;
              weakest = a;
            }
          }
          return weakest;
        }
      },
      
      // Healthiest object
      healthiest: {
        enemy: () => {
          let healthiest = null, maxHp = 0;
          for (const e of units) {
            if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0 && e.hp > maxHp) {
              maxHp = e.hp;
              healthiest = e;
            }
          }
          return healthiest;
        },
        enemy_in_range: (range: number) => {
          let healthiest = null, maxHp = 0;
          const rangeSq = range * range;
          for (const e of units) {
            if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
              if (dx * dx + dy * dy <= rangeSq && e.hp > maxHp) {
                maxHp = e.hp;
                healthiest = e;
              }
            }
          }
          return healthiest;
        }
      },
      
      // Centroid object
      centroid: {
        wounded_allies: () => {
          const wounded = units.filter((u: Unit) => 
            u.team === unit.team && u.id !== unit.id && 
            u.state !== 'dead' && u.hp < u.maxHp
          );
          if (wounded.length === 0) return null;
          const x = wounded.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / wounded.length;
          const y = wounded.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / wounded.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        allies: () => {
          const allies = units.filter((u: Unit) => 
            u.team === unit.team && u.id !== unit.id && u.state !== 'dead'
          );
          if (allies.length === 0) return null;
          const x = allies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / allies.length;
          const y = allies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / allies.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        enemies: () => {
          const enemies = units.filter((u: Unit) => u.team !== unit.team && u.state !== 'dead');
          if (enemies.length === 0) return null;
          const x = enemies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) / enemies.length;
          const y = enemies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) / enemies.length;
          return { x: Math.round(x), y: Math.round(y) };
        }
      },
      
      // Pick function
      pick: (array: any[]) => array[Math.floor(tickContext.getRandom() * array.length)],
      
      // Random position function
      randomPos: (centerX: number, centerY: number, range: number) => ({
        x: centerX + (tickContext.getRandom() - 0.5) * 2 * range,
        y: centerY + (tickContext.getRandom() - 0.5) * 2 * range
      })
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

export const dslCompiler = new DSLCompiler();