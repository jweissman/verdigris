import type { TickContext } from "../core/tick_context";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

export default class DSL {
  static clearCache() {
    // No cache to clear
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
    const allUnits = cachedAllUnits || context.getAllUnits();

    // Fast path for self HP checks
    if (expression.match(/^self\.hp\s*<\s*self\.maxHp\s*\*\s*[\d.]+$/)) {
      const factorMatch = expression.match(/\*\s*([\d.]+)$/);
      if (factorMatch) {
        const factor = parseFloat(factorMatch[1]);
        return subject.hp < subject.maxHp * factor;
      }
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

    let weakest: any;
    let strongest: any;
    let mostInjured: any;
    let healthiest: any;
    let nearest: any;
    let closest: any;
    let furthest: any;
    let farthest: any;

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

    let allies = () =>
      allUnits.filter(
        (u) =>
          u.team === subject.team && u.state !== "dead" && u.id !== subject.id,
      );
    let enemies = () =>
      allUnits.filter((u) => u.team !== subject.team && u.state !== "dead");
    let all = () => allUnits.filter((u) => u.state !== "dead");

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
