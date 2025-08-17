import type { TickContext } from "../core/tick_context";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

export default class DSL {
  // Global cache for expensive computations - cleared each tick
  private static globalCache = new Map<string, any>();
  
  static clearCache() {
    this.globalCache.clear();
  }

  static noun = (
    unit: Unit,
    allUnits: readonly Unit[],
    context: TickContext,
    sort: ((a: Unit, b: Unit) => number) | null = null,
    filter: (unit: Unit) => boolean = (u) => true,
    dist2Fn?: (u1: Unit, u2: Unit) => number,
  ) => {
    // Simple cache key without expensive toString() calls
    const sortKey = sort ? 'sorted' : 'none';
    const cacheKey = `${unit.id}_${sortKey}`;
    
    // Use fast distance function if provided, fallback to pos access
    const dist2 = dist2Fn || ((u1: Unit, u2: Unit) => {
      const dx = u1.pos.x - u2.pos.x;
      const dy = u1.pos.y - u2.pos.y;
      return dx * dx + dy * dy;
    });
    
    return {
      ally: () => {
        const key = `${cacheKey}_ally`;
        if (!this.globalCache.has(key)) {
          // Fast linear search instead of double filter
          let bestAlly: Unit | null = null;
          let bestScore = sort ? Infinity : 0;
          
          for (const u of allUnits) {
            if (u.team === unit.team && u.state !== 'dead' && u.id !== unit.id && filter(u)) {
              if (!sort) {
                bestAlly = u;
                break; // Take first match if no sorting
              } else {
                const score = sort(u, unit);
                if (score < bestScore) {
                  bestScore = score;
                  bestAlly = u;
                }
              }
            }
          }
          this.globalCache.set(key, bestAlly);
        }
        return this.globalCache.get(key);
      },
      enemy: () => {
        const key = `${cacheKey}_enemy`;
        if (!this.globalCache.has(key)) {
          // Fast linear search instead of double filter
          let bestEnemy: Unit | null = null;
          let bestScore = sort ? Infinity : 0;
          
          for (const u of allUnits) {
            if (u.team !== unit.team && u.state !== 'dead' && filter(u)) {
              if (!sort) {
                bestEnemy = u;
                break; // Take first match if no sorting
              } else {
                const score = sort(u, unit);
                if (score < bestScore) {
                  bestScore = score;
                  bestEnemy = u;
                }
              }
            }
          }
          this.globalCache.set(key, bestEnemy);
        }
        return this.globalCache.get(key);
      },
      in_range: (range: number) => {
        const rangeFilter = (u: Unit) => {
          return dist2(u, unit) <= (range * range) && filter(u);
        };
        return this.noun(unit, allUnits, context, sort, rangeFilter, dist2);
      },
      enemy_in_range: (range: number) => {
        const key = `${cacheKey}_enemy_in_range_${range}`;
        if (!this.globalCache.has(key)) {
          // Ultra-fast SoA direct search - bypass proxies entirely!
          let bestEnemy: Unit | null = null;
          let bestScore = sort ? Infinity : 0;
          const rangeSq = range * range;
          
          const arrays = context.getArrays();
          const unitIndex = context.getUnitIndex(unit.id);
          
          if (unitIndex !== undefined) {
            const unitX = arrays.posX[unitIndex];
            const unitY = arrays.posY[unitIndex];
            const unitTeam = arrays.team[unitIndex];
            
            // Ultra-fast direct array access - no proxy overhead!
            for (const idx of arrays.activeIndices) {
              if (idx === unitIndex) continue;
              
              // Check team and state at array level first
              const candidateTeam = arrays.team[idx];
              const candidateState = arrays.state[idx];
              
              if (candidateTeam !== unitTeam && candidateState !== 3) { // 3 = dead
                const dx = arrays.posX[idx] - unitX;
                const dy = arrays.posY[idx] - unitY;
                const distSq = dx * dx + dy * dy;
                
                if (distSq <= rangeSq) {
                  // Only create proxy if we found a match
                  const candidate = allUnits.find(u => context.getUnitIndex(u.id) === idx);
                  if (candidate && filter(candidate)) {
                    if (!sort) {
                      bestEnemy = candidate;
                      break;
                    } else {
                      const score = sort(candidate, unit);
                      if (score < bestScore) {
                        bestScore = score;
                        bestEnemy = candidate;
                      }
                    }
                  }
                }
              }
            }
          } else {
            // Fallback to proxy method
            for (const u of allUnits) {
              if (u.team !== unit.team && u.state !== 'dead' && filter(u)) {
                const distSq = dist2(u, unit);
                if (distSq <= rangeSq) {
                  if (!sort) {
                    bestEnemy = u;
                    break;
                  } else {
                    const score = sort(u, unit);
                    if (score < bestScore) {
                      bestScore = score;
                      bestEnemy = u;
                    }
                  }
                }
              }
            }
          }
          this.globalCache.set(key, bestEnemy);
        }
        return this.globalCache.get(key);
      }
    }
  };

  static evaluate(
    expression: string,
    subject: Unit,
    context: TickContext,
    target?: any,
    cachedAllUnits?: readonly Unit[],
  ): any {
    const allUnits = cachedAllUnits || context.getAllUnits();
    
    // Ultra-fast SoA distance calculation
    const arrays = context.getArrays();
    const subjectIndex = context.getUnitIndex(subject.id);
    
    let dist2 = (unit1: Unit, unit2: Unit) => {
      // Try SoA fast path first
      const idx1 = context.getUnitIndex(unit1.id);
      const idx2 = context.getUnitIndex(unit2.id);
      
      if (idx1 !== undefined && idx2 !== undefined) {
        const dx = arrays.posX[idx1] - arrays.posX[idx2];
        const dy = arrays.posY[idx1] - arrays.posY[idx2];
        return dx * dx + dy * dy;
      }
      
      // Fallback to proxy access
      const dx = unit1.pos.x - unit2.pos.x;
      const dy = unit1.pos.y - unit2.pos.y;
      return dx * dx + dy * dy;
    };

    // Ultra-lazy: only create noun objects if they're actually used in the expression
    let weakest: any;
    let strongest: any;
    let mostInjured: any; 
    let healthiest: any;
    let nearest: any;
    let closest: any;
    let furthest: any;
    let farthest: any;
    
    // Check if expression uses these expensive operations
    if (expression.includes('weakest')) {
      weakest = this.noun(subject, allUnits, context, (a, b) => a.hp - b.hp, undefined, dist2);
    }
    if (expression.includes('strongest')) {
      strongest = this.noun(subject, allUnits, context, (a, b) => b.hp - a.hp, undefined, dist2);
    }
    if (expression.includes('mostInjured')) {
      mostInjured = this.noun(subject, allUnits, context, (a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp), undefined, dist2);
    }
    if (expression.includes('healthiest')) {
      healthiest = this.noun(subject, allUnits, context, (a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp), undefined, dist2);
    }
    if (expression.includes('nearest') || expression.includes('closest')) {
      nearest = this.noun(subject, allUnits, context, (a, b) => {
        const distA = dist2(a, subject);
        const distB = dist2(b, subject);
        return distA - distB;
      }, undefined, dist2);
      closest = nearest;
    }
    if (expression.includes('furthest') || expression.includes('farthest')) {
      furthest = this.noun(subject, allUnits, context, (a, b) => {
        const distA = dist2(a, subject);
        const distB = dist2(b, subject);
        return distB - distA;
      }, undefined, dist2);
      farthest = furthest;
    }

    let distance = (target: Vec2 | Unit | null) => {
      if (!target) return Infinity;
      if ((target as Unit).id) {
        // It's a Unit - use fast dist2
        return Math.sqrt(dist2(target as Unit, subject));
      } else {
        // It's a Vec2 - use traditional calc
        const pos = target as Vec2;
        return Math.sqrt(
          Math.pow(subject.pos.x - pos.x, 2) + Math.pow(subject.pos.y - pos.y, 2),
        );
      }
    };

    // Basic filter functions for backward compatibility
    let allies = () => allUnits.filter(u => u.team === subject.team && u.state !== 'dead' && u.id !== subject.id);
    let enemies = () => allUnits.filter(u => u.team !== subject.team && u.state !== 'dead');
    let all = () => allUnits.filter(u => u.state !== 'dead');
    
    let wounded = (u: Unit) => u.hp < u.maxHp;
    let within_range = (range: number) => (u: Unit) => distance(u) <= range;

    let centroid = {
      allies: () => {
        const units = allies();
        if (units.length === 0) return null;
        const x = units.reduce((sum, u) => sum + u.pos.x, 0) / units.length;
        const y = units.reduce((sum, u) => sum + u.pos.y, 0) / units.length;
        return { x: Math.round(x), y: Math.round(y) };
      },
      enemies: () => {
        const units = enemies();
        if (units.length === 0) return null;
        const x = units.reduce((sum, u) => sum + u.pos.x, 0) / units.length;
        const y = units.reduce((sum, u) => sum + u.pos.y, 0) / units.length;
        return { x: Math.round(x), y: Math.round(y) };
      },
      wounded_allies: () => {
        const units = allies().filter(wounded);
        if (units.length === 0) return null;
        const x = units.reduce((sum, u) => sum + u.pos.x, 0) / units.length;
        const y = units.reduce((sum, u) => sum + u.pos.y, 0) / units.length;
        return { x: Math.round(x), y: Math.round(y) };
      },
    };

    let random = {
      position: () => ({
        x: Math.round(context.getRandom() * context.getFieldWidth()),
        y: Math.round(context.getRandom() * context.getFieldHeight()),
      }),
      ally: () => {
        const units = allies();
        return units.length > 0
          ? units[Math.floor(context.getRandom() * units.length)]
          : null;
      },
      enemy: () => {
        const units = enemies();
        return units.length > 0
          ? units[Math.floor(context.getRandom() * units.length)]
          : null;
      },
    };

    let unit = (id: string) => context.findUnitById(id) || null;

    let randomFloat = (min: number, max: number) =>
      min + context.getRandom() * (max - min);
    let randomInt = (min: number, max: number) =>
      Math.floor(randomFloat(min, max + 1));
    let pick = (array: any[]) =>
      array[Math.floor(context.getRandom() * array.length)];
    let randomPos = (centerX: number, centerY: number, range: number) => ({
      x: centerX + randomFloat(-range, range),
      y: centerY + randomFloat(-range, range),
    });

    let self = subject;

    try {
      let ret = eval(expression);
      if (ret === undefined || ret === null) {
        return null;
      }
      return ret;
    } catch (error) {
      console.warn(`DSL evaluation error for expression: ${expression}`, error);
      return null;
    }
  }
}
