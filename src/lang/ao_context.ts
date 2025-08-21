/**
 * AoContext - Compositional context model for the Ao DSL
 * 
 * From a PLT perspective, this provides a clean, extensible environment
 * for expression evaluation. Rather than ad-hoc context building, we define
 * a structured model with clear semantics.
 * 
 * Key principles:
 * 1. Compositional: Contexts can be combined/extended
 * 2. Lazy: Expensive operations are deferred until needed
 * 3. Pure: Context creation doesn't cause side effects
 * 4. Extensible: New helpers can be added without modifying core
 */

import type { Unit } from '../types/Unit';
import type { TickContext } from '../core/tick_context';

/**
 * A helper group provides named functions/values for a specific domain
 */
export interface HelperGroup {
  [key: string]: any;
}

/**
 * Context builder for lazy evaluation
 */
export type ContextBuilder = () => HelperGroup;

/**
 * The structured context model for Ao expressions
 */
export class AoContext {
  private helpers: Map<string, HelperGroup | ContextBuilder> = new Map();
  private cache: Map<string, HelperGroup> = new Map();
  
  /**
   * Register a helper group with immediate values
   */
  addHelpers(name: string, helpers: HelperGroup): this {
    this.helpers.set(name, helpers);
    return this;
  }
  
  /**
   * Register a helper group with lazy evaluation
   */
  addLazyHelpers(name: string, builder: ContextBuilder): this {
    this.helpers.set(name, builder);
    return this;
  }
  
  /**
   * Build the final context object for Ao evaluation
   */
  build(): any {
    const context: any = {};
    
    // Merge all helper groups into flat context
    for (const [name, helperOrBuilder] of this.helpers) {
      let helpers: HelperGroup;
      
      if (typeof helperOrBuilder === 'function') {
        // Lazy evaluation with caching
        if (!this.cache.has(name)) {
          this.cache.set(name, helperOrBuilder());
        }
        helpers = this.cache.get(name)!;
      } else {
        helpers = helperOrBuilder;
      }
      
      // Merge helpers into context
      Object.assign(context, helpers);
    }
    
    return context;
  }
  
  /**
   * Clear any cached lazy evaluations
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Create a new context by extending this one
   */
  extend(): AoContext {
    const extended = new AoContext();
    // Copy existing helpers (not cache)
    for (const [name, helpers] of this.helpers) {
      extended.helpers.set(name, helpers);
    }
    return extended;
  }
}

/**
 * Standard helper groups for game DSL
 */
export class StandardHelpers {
  /**
   * Core unit properties
   */
  static unitProperties(unit: Unit): HelperGroup {
    return {
      self: unit,
      unit: unit,
      hp: unit.hp,
      maxHp: unit.maxHp,
      pos: unit.pos,
      team: unit.team,
      state: unit.state,
      abilities: unit.abilities || []
    };
  }
  
  /**
   * Math utilities
   */
  static math(): HelperGroup {
    return {
      Math: Math,
      min: Math.min,
      max: Math.max,
      abs: Math.abs,
      sqrt: Math.sqrt,
      pow: Math.pow,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round
    };
  }
  
  /**
   * Array utilities
   */
  static arrays(): HelperGroup {
    return {
      Array: Array
    };
  }
  
  /**
   * Distance calculations
   */
  static distance(unit: Unit): HelperGroup {
    return {
      distance: (target: any) => {
        if (!target) return Infinity;
        const pos = target.pos || target;
        const dx = pos.x - unit.pos.x;
        const dy = pos.y - unit.pos.y;
        return Math.sqrt(dx * dx + dy * dy);
      }
    };
  }
  
  /**
   * Unit finders (expensive, should be lazy)
   */
  static finders(unit: Unit, getUnits: () => readonly Unit[]): HelperGroup {
    return {
      closest: {
        enemy: () => {
          let closest = null, minDist = Infinity;
          for (const e of getUnits()) {
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
          for (const a of getUnits()) {
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
      
      weakest: {
        ally: () => {
          let weakest = null, minHp = Infinity;
          for (const a of getUnits()) {
            if (a.team === unit.team && a.id !== unit.id && a.state !== 'dead' && a.hp > 0 && a.hp < minHp) {
              minHp = a.hp;
              weakest = a;
            }
          }
          return weakest;
        }
      },
      
      healthiest: {
        enemy: () => {
          let healthiest = null, maxHp = 0;
          for (const e of getUnits()) {
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
          for (const e of getUnits()) {
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
      }
    };
  }
  
  /**
   * Counting helpers
   */
  static counters(unit: Unit, getUnits: () => readonly Unit[]): HelperGroup {
    return {
      count: {
        enemies_in_range: (range: number) => {
          const rangeSq = range * range;
          let count = 0;
          for (const e of getUnits()) {
            if (e.team !== unit.team && e.state !== 'dead' && e.hp > 0) {
              const dx = e.pos.x - unit.pos.x;
              const dy = e.pos.y - unit.pos.y;
              if (dx * dx + dy * dy <= rangeSq) count++;
            }
          }
          return count;
        },
        
        allies: () => {
          return getUnits().filter(u => u.team === unit.team && u.state !== 'dead' && u.hp > 0).length;
        },
        
        enemies: () => {
          return getUnits().filter(u => u.team !== unit.team && u.state !== 'dead' && u.hp > 0).length;
        }
      }
    };
  }
  
  /**
   * Centroid calculations
   */
  static centroids(unit: Unit, getUnits: () => readonly Unit[]): HelperGroup {
    return {
      centroid: {
        wounded_allies: () => {
          const wounded = getUnits().filter(
            (u: Unit) =>
              u.team === unit.team &&
              u.id !== unit.id &&
              u.state !== "dead" &&
              u.hp < u.maxHp,
          );
          if (wounded.length === 0) return null;
          const x =
            wounded.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) /
            wounded.length;
          const y =
            wounded.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) /
            wounded.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        allies: () => {
          const allies = getUnits().filter(
            (u: Unit) =>
              u.team === unit.team && u.id !== unit.id && u.state !== "dead",
          );
          if (allies.length === 0) return null;
          const x =
            allies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) /
            allies.length;
          const y =
            allies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) /
            allies.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
        enemies: () => {
          const enemies = getUnits().filter(
            (u: Unit) => u.team !== unit.team && u.state !== "dead",
          );
          if (enemies.length === 0) return null;
          const x =
            enemies.reduce((sum: number, u: Unit) => sum + u.pos.x, 0) /
            enemies.length;
          const y =
            enemies.reduce((sum: number, u: Unit) => sum + u.pos.y, 0) /
            enemies.length;
          return { x: Math.round(x), y: Math.round(y) };
        },
      }
    };
  }
  
  /**
   * Random utilities
   */
  static random(tickContext: TickContext): HelperGroup {
    return {
      random: () => tickContext.getRandom(),
      pick: (array: any[]) => array[Math.floor(tickContext.getRandom() * array.length)],
      randomPos: (centerX: number, centerY: number, range: number) => ({
        x: centerX + (tickContext.getRandom() - 0.5) * 2 * range,
        y: centerY + (tickContext.getRandom() - 0.5) * 2 * range,
      })
    };
  }
}

/**
 * Create a standard game context for DSL evaluation
 */
export function createGameContext(
  unit: Unit, 
  tickContext: TickContext,
  cachedUnits?: readonly Unit[]
): any {
  const getUnits = () => cachedUnits || tickContext.getAllUnits();
  
  return new AoContext()
    .addHelpers('unit', StandardHelpers.unitProperties(unit))
    .addHelpers('math', StandardHelpers.math())
    .addHelpers('arrays', StandardHelpers.arrays())
    .addHelpers('distance', StandardHelpers.distance(unit))
    .addLazyHelpers('finders', () => StandardHelpers.finders(unit, getUnits))
    .addLazyHelpers('counters', () => StandardHelpers.counters(unit, getUnits))
    .addLazyHelpers('centroids', () => StandardHelpers.centroids(unit, getUnits))
    .addHelpers('random', StandardHelpers.random(tickContext))
    .build();
}

export default AoContext;