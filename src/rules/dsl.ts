import type { TickContext } from "../core/tick_context";
import { Unit } from "../types/Unit";
import { isEnemy } from "../core/team_utils";

export default class DSL {
  static clearCache() {}

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
          if (isEnemy(unit, u) && filter(u)) {
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
          if (isEnemy(unit, u) && filter(u)) {
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
}
