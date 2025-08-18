import type { TickContext } from "../core/tick_context";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

export default class DSL {
  private static expressionCache = new Map<string, any>();
  private static compiledCache = new Map<string, Function>();
  
  static clearCache() {
    this.expressionCache.clear();
  }

  static compile(expression: string): (subject: Unit, context: TickContext, target?: any) => any {
    if (this.compiledCache.has(expression)) {
      return this.compiledCache.get(expression) as (subject: Unit, context: TickContext, target?: any) => any;
    }

    const fn = (subject: Unit, context: TickContext, target?: any) => {
      return DSL.evaluate(expression, subject, context, target);
    };

    this.compiledCache.set(expression, fn);
    return fn;
  }

  static noun = (
    unit: Unit,
    allUnits: readonly Unit[],
    context: TickContext,
    sort: ((a: Unit, b: Unit) => number) | null = null,
    filter: (unit: Unit) => boolean = (u) => true,
    dist2Fn?: (u1: Unit, u2: Unit) => number,
  ) => {
    const sortKey = sort ? "sorted" : "none";
    const cacheKey = `${unit.id}_${sortKey}`;

    const dist2 =
      dist2Fn ||
      ((u1: Unit, u2: Unit) => {
        const dx = u1.pos.x - u2.pos.x;
        const dy = u1.pos.y - u2.pos.y;
        return dx * dx + dy * dy;
      });

    // Early exit optimization for common case
    const isDistanceSort = sort && sort.toString().includes("dist2");

    return {
      ally: () => {
        let bestAlly: Unit | null = null;
        let bestScore = sort ? Infinity : 0;

        for (const u of allUnits) {
          if (
            u.team === unit.team &&
            u.state !== "dead" &&
            u.id !== unit.id &&
            filter(u)
          ) {
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
        return bestAlly;
      },
      enemy: () => {
        let bestEnemy: Unit | null = null;
        let bestScore = sort ? Infinity : 0;

        for (const u of allUnits) {
          if (u.team !== unit.team && u.state !== "dead" && filter(u)) {
            if (!sort) {
              return u; // Return first enemy found when not sorting
            }
            const score = sort(u, unit);
            if (score < bestScore) {
              bestScore = score;
              bestEnemy = u;
            }
          }
        }
        return bestEnemy;
      },
      in_range: (range: number) => {
        const rangeFilter = (u: Unit) => {
          return dist2(u, unit) <= range * range && filter(u);
        };
        return this.noun(unit, allUnits, context, sort, rangeFilter, dist2);
      },
      enemy_in_range: (range: number) => {
        let bestEnemy: Unit | null = null;
        let bestScore = sort ? Infinity : 0;
        const rangeSq = range * range;

        for (const u of allUnits) {
          if (u.team !== unit.team && u.state !== "dead" && filter(u)) {
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
        return bestEnemy;
      },
    };
  };

  static evaluate(
    expression: string,
    subject: Unit,
    context: TickContext,
    target?: any,
    cachedAllUnits?: readonly Unit[],
  ): any {
    // Don't cache - it's not helping because we clear every tick
    // and evaluate different expressions per unit
    
    const allUnits = cachedAllUnits || context.getAllUnits();

    // === COMMON FAST PATHS ===
    // These patterns are extremely common and can be evaluated without full DSL parsing
    
    // Simple booleans
    if (expression === "true") return true;
    if (expression === "false") return false;
    
    // Self HP checks - very common in abilities
    if (expression.match(/^self\.hp\s*<\s*self\.maxHp\s*\*\s*[\d.]+$/)) {
      const factorMatch = expression.match(/\*\s*([\d.]+)$/);
      if (factorMatch) {
        const factor = parseFloat(factorMatch[1]);
        return subject.hp < subject.maxHp * factor;
      }
    }
    
    // Direct self property checks
    if (expression === "self.hp < 10") return subject.hp < 10;
    if (expression === "self.hp < 5") return subject.hp < 5;
    if (expression === "self.hp == self.maxHp") return subject.hp === subject.maxHp;
    
    // Fast path for "closest.ally() != null" - just check if alone
    if (expression === "closest.ally() != null") {
      for (const u of allUnits) {
        if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
          return true; // Found an ally, not alone
        }
      }
      return false; // No allies found, alone
    }
    
    // Fast path for "closest.enemy() != null" - just check if enemies exist
    if (expression === "closest.enemy() != null") {
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          return true; // Found an enemy
        }
      }
      return false; // No enemies
    }
    
    // Fast path for common trigger patterns - just check if ANY enemy is in range
    // Only use this for pure distance checks, not when we need the actual enemy object
    const distancePattern =
      /^distance\(closest\.enemy\(\)\?\.pos\)\s*(<=|>)\s*(\d+)$/;
    const match = expression.match(distancePattern);
    if (match) {
      const operator = match[1];
      const rangeSq = Math.pow(parseInt(match[2]), 2);

      if (operator === "<=") {
        // Check if ANY enemy is within range
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            const dx = u.pos.x - subject.pos.x;
            const dy = u.pos.y - subject.pos.y;
            if (dx * dx + dy * dy <= rangeSq) {
              return true;
            }
          }
        }
        return false;
      } else if (operator === ">") {
        // Check if ALL enemies are beyond range (or no enemies)
        let hasCloseEnemy = false;
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            const dx = u.pos.x - subject.pos.x;
            const dy = u.pos.y - subject.pos.y;
            if (dx * dx + dy * dy <= rangeSq) {
              hasCloseEnemy = true;
              break;
            }
          }
        }
        return !hasCloseEnemy;
      }
    }
    
    // Fast paths for exact distance checks - most common ability triggers
    const exactDistanceChecks: { [key: string]: number } = {
      "distance(closest.enemy()?.pos) <= 1": 1,
      "distance(closest.enemy()?.pos) <= 2": 4,
      "distance(closest.enemy()?.pos) <= 3": 9,
      "distance(closest.enemy()?.pos) <= 5": 25,
      "distance(closest.enemy()?.pos) <= 6": 36,
      "distance(closest.enemy()?.pos) <= 8": 64,
      "distance(closest.enemy()?.pos) <= 10": 100,
      "distance(closest.enemy()?.pos) <= 12": 144,
      "distance(closest.enemy()?.pos) <= 15": 225,
      "distance(closest.enemy()?.pos) <= 20": 400,
    };
    
    if (exactDistanceChecks[expression] !== undefined) {
      const rangeSq = exactDistanceChecks[expression];
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          if (dx * dx + dy * dy <= rangeSq) {
            return true;
          }
        }
      }
      return false;
    }
    
    // Fast paths for > distance checks
    const greaterDistanceChecks: { [key: string]: number } = {
      "distance(closest.enemy()?.pos) > 8": 64,
      "distance(closest.enemy()?.pos) > 10": 100,
      "distance(closest.enemy()?.pos) > 2": 4,
      "distance(closest.enemy()?.pos) > 5": 25,
    };
    
    if (greaterDistanceChecks[expression] !== undefined) {
      const rangeSq = greaterDistanceChecks[expression];
      let hasCloseEnemy = false;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          if (dx * dx + dy * dy <= rangeSq) {
            hasCloseEnemy = true;
            break;
          }
        }
      }
      return !hasCloseEnemy;
    }
    
    // Fast path for "enemies().length > 0" check
    if (expression === "enemies().length > 0") {
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          return true;
        }
      }
      return false;
    }
    
    // Fast path for combined distance checks with && operator
    if (expression === "distance(closest.enemy()?.pos) <= 14 && distance(closest.enemy()?.pos) > 5") {
      let foundInRange = false;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= 196 && distSq > 25) { // 14^2 and 5^2
            foundInRange = true;
            break;
          }
        }
      }
      return foundInRange;
    }
    
    if (expression === "distance(closest.enemy()?.pos) <= 10 && distance(closest.enemy()?.pos) > 2") {
      let foundInRange = false;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq <= 100 && distSq > 4) { // 10^2 and 2^2
            foundInRange = true;
            break;
          }
        }
      }
      return foundInRange;
    }
    
    // Fast path for simple OR expressions
    if (expression === "distance(closest.enemy()?.pos) <= 12 || true") {
      return true; // Always true due to || true
    }

    const arrays = (context as any).getArrays?.();
    const subjectIndex = (context as any).getUnitIndex?.(subject.id);

    let dist2 = (unit1: Unit, unit2: Unit) => {
      const idx1 = (context as any).getUnitIndex?.(unit1.id);
      const idx2 = (context as any).getUnitIndex?.(unit2.id);

      if (idx1 !== undefined && idx2 !== undefined) {
        const dx = arrays.posX[idx1] - arrays.posX[idx2];
        const dy = arrays.posY[idx1] - arrays.posY[idx2];
        return dx * dx + dy * dy;
      }

      const dx = unit1.pos.x - unit2.pos.x;
      const dy = unit1.pos.y - unit2.pos.y;
      return dx * dx + dy * dy;
    };

    // Skip all helper creation if we can parse simply
    // Use a special sentinel value to indicate "couldn't parse"
    const COULD_NOT_PARSE = Symbol('COULD_NOT_PARSE');
    const simpleResult = this.trySimpleParse(expression, subject, allUnits, context, COULD_NOT_PARSE);
    if (simpleResult !== COULD_NOT_PARSE) {
      return simpleResult;
    }
    
    // Create noun helpers lazily
    let weakest: any;
    let strongest: any;
    let mostInjured: any;
    let healthiest: any;
    let nearest: any;
    let closest: any;
    let furthest: any;
    let farthest: any;

    // Only create if actually used in expression
    if (expression.includes("weakest")) {
      weakest = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => a.hp - b.hp,
        undefined,
        dist2,
      );
    }
    if (expression.includes("strongest")) {
      strongest = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => b.hp - a.hp,
        undefined,
        dist2,
      );
    }
    if (expression.includes("mostInjured")) {
      mostInjured = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => a.hp / a.maxHp - b.hp / b.maxHp,
        undefined,
        dist2,
      );
    }
    if (expression.includes("healthiest")) {
      healthiest = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => b.hp / b.maxHp - a.hp / a.maxHp, // LOWEST score wins, so invert: we want highest health%
        undefined,
        dist2,
      );
    }
    if (expression.includes("nearest") || expression.includes("closest")) {
      nearest = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => {
          const distA = dist2(a, subject);
          const distB = dist2(b, subject);
          return distA - distB;
        },
        undefined,
        dist2,
      );
      closest = nearest;
    }
    if (expression.includes("furthest") || expression.includes("farthest")) {
      furthest = this.noun(
        subject,
        allUnits,
        context,
        (a, b) => {
          const distA = dist2(a, subject);
          const distB = dist2(b, subject);
          return distB - distA;
        },
        undefined,
        dist2,
      );
      farthest = furthest;
    }

    let distance = (target: Vec2 | Unit | null) => {
      if (!target) return Infinity;
      if ((target as Unit).id) {
        return Math.sqrt(dist2(target as Unit, subject));
      } else {
        const pos = target as Vec2;
        return Math.sqrt(
          Math.pow(subject.pos.x - pos.x, 2) +
            Math.pow(subject.pos.y - pos.y, 2),
        );
      }
    };

    // Create function helpers lazily - only if used
    let allies: any;
    let enemies: any;
    let all: any;
    let wounded: any;
    let within_range: any;
    
    if (expression.includes("allies")) {
      allies = () =>
        allUnits.filter(
          (u) =>
            u.team === subject.team && u.state !== "dead" && u.id !== subject.id,
        );
    }
    if (expression.includes("enemies")) {
      enemies = () =>
        allUnits.filter((u) => u.team !== subject.team && u.state !== "dead");
    }
    if (expression.includes("all(")) {
      all = () => allUnits.filter((u) => u.state !== "dead");
    }
    if (expression.includes("wounded")) {
      wounded = (u: Unit) => u.hp < u.maxHp;
    }
    if (expression.includes("within_range")) {
      within_range = (range: number) => (u: Unit) => distance(u) <= range;
    }

    let centroid: any;
    if (expression.includes("centroid")) {
      // Make sure allies/enemies are defined if centroid needs them
      if (!allies && expression.includes("centroid.allies")) {
        allies = () =>
          allUnits.filter(
            (u) =>
              u.team === subject.team && u.state !== "dead" && u.id !== subject.id,
          );
      }
      if (!enemies && expression.includes("centroid.enemies")) {
        enemies = () =>
          allUnits.filter((u) => u.team !== subject.team && u.state !== "dead");
      }
      if (!wounded && expression.includes("wounded_allies")) {
        wounded = (u: Unit) => u.hp < u.maxHp;
      }
      
      centroid = {
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
    }

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
    
    // Track what expressions still need eval (for debugging)
    // console.warn(`[DSL] Eval fallback for: "${expression}"`);
    
    // Fall back to eval for complex expressions
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
  
  // Simple parser for common DSL patterns to avoid eval
  // This handles 99% of ability expressions without eval overhead
  // Returns a special COULD_NOT_PARSE symbol if it can't parse the expression
  private static trySimpleParse(
    expression: string,
    subject: Unit,
    allUnits: readonly Unit[],
    context: TickContext,
    COULD_NOT_PARSE: symbol = Symbol('COULD_NOT_PARSE')
  ): any {
    // Handle backtick-wrapped expressions with eval (escape hatch for complex expressions)
    if (expression.startsWith('`') && expression.endsWith('`')) {
      // Remove backticks and fall through to eval
      return undefined; // Let eval handle it
    }
    // Handle simple property access patterns
    if (expression.startsWith("self.")) {
      const prop = expression.substring(5);
      if (prop === "hp") return subject.hp;
      if (prop === "maxHp") return subject.maxHp;
      if (prop === "pos") return subject.pos;
      if (prop === "team") return subject.team;
      if (prop === "state") return subject.state;
      if (prop === "id") return subject.id;
      if (prop.startsWith("meta.")) {
        const metaProp = prop.substring(5);
        return subject.meta?.[metaProp];
      }
    }
    
    // Handle simple numeric comparisons
    const comparisonMatch = expression.match(/^self\.(\w+)\s*([<>=]+)\s*([\d.]+)$/);
    if (comparisonMatch) {
      const [, prop, op, valueStr] = comparisonMatch;
      const value = parseFloat(valueStr);
      const propValue = (subject as any)[prop];
      
      if (propValue !== undefined) {
        switch (op) {
          case "<": return propValue < value;
          case "<=": return propValue <= value;
          case ">": return propValue > value;
          case ">=": return propValue >= value;
          case "==": return propValue === value;
          case "!=": return propValue !== value;
        }
      }
    }
    
    // Handle closest.enemy() and closest.ally() - most common
    if (expression === "closest.enemy()") {
      let closestEnemy: Unit | null = null;
      let minDistSq = Infinity;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestEnemy = u;
          }
        }
      }
      return closestEnemy;
    }
    
    if (expression === "closest.ally()") {
      let closestAlly: Unit | null = null;
      let minDistSq = Infinity;
      for (const u of allUnits) {
        if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestAlly = u;
          }
        }
      }
      return closestAlly;
    }
    
    // Handle weakest.ally() and similar
    if (expression === "weakest.ally()") {
      let weakestAlly: Unit | null = null;
      let lowestHp = Infinity;
      for (const u of allUnits) {
        if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
          if (u.hp < lowestHp) {
            lowestHp = u.hp;
            weakestAlly = u;
          }
        }
      }
      return weakestAlly;
    }
    
    // Handle closest.enemy()?.pos
    if (expression === "closest.enemy()?.pos") {
      let closestEnemy: Unit | null = null;
      let minDistSq = Infinity;
      for (const u of allUnits) {
        if (u.team !== subject.team && u.state !== "dead") {
          const dx = u.pos.x - subject.pos.x;
          const dy = u.pos.y - subject.pos.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestEnemy = u;
          }
        }
      }
      return closestEnemy?.pos || null;
    }
    
    // Handle weakest.ally()?.pos  
    if (expression === "weakest.ally()?.pos") {
      let weakestAlly: Unit | null = null;
      let lowestHp = Infinity;
      for (const u of allUnits) {
        if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
          if (u.hp < lowestHp) {
            lowestHp = u.hp;
            weakestAlly = u;
          }
        }
      }
      return weakestAlly?.pos || null;
    }
    
    // Handle distance(X) <= Y or distance(X) > Y patterns
    const distanceMatch = expression.match(/^distance\((.+?)\)\s*([<>=]+)\s*(\d+(?:\.\d+)?)$/);
    if (distanceMatch) {
      const [, targetExpr, op, distStr] = distanceMatch;
      const maxDist = parseFloat(distStr);
      
      // Parse the target expression
      const targetPos = this.trySimpleParse(targetExpr, subject, allUnits, context, COULD_NOT_PARSE);
      if (targetPos === COULD_NOT_PARSE) return COULD_NOT_PARSE;
      if (!targetPos) return false; // No target found
      
      const dx = targetPos.x - subject.pos.x;
      const dy = targetPos.y - subject.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      switch (op) {
        case '<': return dist < maxDist;
        case '<=': return dist <= maxDist;
        case '>': return dist > maxDist;
        case '>=': return dist >= maxDist;
        case '==': return dist === maxDist;
        default: return undefined;
      }
    }
    
    // Handle property access with ?. operator
    if (expression.includes('?.')) {
      const parts = expression.split('?.');
      if (parts[0] === 'closest.ally()') {
        let closestAlly: Unit | null = null;
        let minDistSq = Infinity;
        for (const u of allUnits) {
          if (u.team === subject.team && u.id !== subject.id && u.state !== "dead") {
            const dx = u.pos.x - subject.pos.x;
            const dy = u.pos.y - subject.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closestAlly = u;
            }
          }
        }
        
        if (!closestAlly) return null;
        
        // Handle the rest of the property access
        let result: any = closestAlly;
        for (let i = 1; i < parts.length; i++) {
          if (!result) return null;
          
          // Handle method calls like includes('construct')
          const methodMatch = parts[i].match(/^(\w+)\((.*)\)$/);
          if (methodMatch) {
            const [, method, args] = methodMatch;
            if (method === 'includes' && result.includes) {
              // Parse the argument (remove quotes)
              const arg = args.replace(/['"`]/g, '');
              return result.includes(arg);
            }
          }
          
          // Handle comparisons like hp < maxHp * 0.7
          const compMatch = parts[i].match(/^(\w+)\s*([<>=]+)\s*(.+)$/);
          if (compMatch) {
            const [, prop, op, rightExpr] = compMatch;
            const leftVal = result[prop];
            
            // Parse right side (handle maxHp * 0.7 pattern)
            const multMatch = rightExpr.match(/^(\w+)\s*\*\s*([\d.]+)$/);
            let rightVal;
            if (multMatch) {
              const [, rightProp, factor] = multMatch;
              rightVal = result[rightProp] * parseFloat(factor);
            } else {
              rightVal = parseFloat(rightExpr);
            }
            
            switch (op) {
              case '<': return leftVal < rightVal;
              case '<=': return leftVal <= rightVal;
              case '>': return leftVal > rightVal;
              case '>=': return leftVal >= rightVal;
              case '==': return leftVal === rightVal;
              default: return undefined;
            }
          }
          
          // Simple property access
          const propMatch = parts[i].match(/^(\w+)$/);
          if (propMatch) {
            result = result[propMatch[1]];
          }
        }
        return result;
      }
      
      if (parts[0] === 'closest.enemy()') {
        let closestEnemy: Unit | null = null;
        let minDistSq = Infinity;
        for (const u of allUnits) {
          if (u.team !== subject.team && u.state !== "dead") {
            const dx = u.pos.x - subject.pos.x;
            const dy = u.pos.y - subject.pos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closestEnemy = u;
            }
          }
        }
        
        if (!closestEnemy) return null;
        
        // Handle the rest like tags?.includes('megabeast')
        let result: any = closestEnemy;
        for (let i = 1; i < parts.length; i++) {
          if (!result) return null;
          
          // Handle method calls
          const methodMatch = parts[i].match(/^(\w+)\((.*)\)$/);
          if (methodMatch) {
            const [, method, args] = methodMatch;
            if (method === 'includes' && result.includes) {
              const arg = args.replace(/['"`]/g, '');
              return result.includes(arg);
            }
          }
          
          // Simple property access
          const propMatch = parts[i].match(/^(\w+)$/);
          if (propMatch) {
            result = result[propMatch[1]];
          }
        }
        return result;
      }
    }
    
    // Handle simple && expressions (must come after other checks)
    if (expression.includes(" && ")) {
      const parts = expression.split(" && ");
      if (parts.length === 2) {
        const left = this.trySimpleParse(parts[0].trim(), subject, allUnits, context, COULD_NOT_PARSE);
        if (left === COULD_NOT_PARSE) return COULD_NOT_PARSE; // Can't parse
        if (left === false) return false; // Short circuit
        const right = this.trySimpleParse(parts[1].trim(), subject, allUnits, context, COULD_NOT_PARSE);
        if (right === COULD_NOT_PARSE) return COULD_NOT_PARSE; // Can't parse
        return left && right;
      }
    }
    
    // Handle simple || expressions (must come after other checks)
    if (expression.includes(" || ")) {
      const parts = expression.split(" || ");
      if (parts.length === 2) {
        const left = this.trySimpleParse(parts[0].trim(), subject, allUnits, context, COULD_NOT_PARSE);
        if (left === COULD_NOT_PARSE) return COULD_NOT_PARSE; // Can't parse
        if (left === true) return true; // Short circuit
        const right = this.trySimpleParse(parts[1].trim(), subject, allUnits, context, COULD_NOT_PARSE);
        if (right === COULD_NOT_PARSE) return COULD_NOT_PARSE; // Can't parse
        return left || right;
      }
    }
    
    // Handle parenthesized expressions
    if (expression.startsWith('(') && expression.endsWith(')')) {
      return this.trySimpleParse(expression.slice(1, -1), subject, allUnits, context, COULD_NOT_PARSE);
    }
    
    // Return the sentinel to indicate we couldn't parse it
    return COULD_NOT_PARSE;
  }
}
