import { Unit, UnitState } from "../types/Unit";
import units from "../../data/units.json";
import folks from "../../data/folks.json";
import * as abilitiesJson from "../../data/abilities.json";

export default class Encyclopaedia {
  static abilities = abilitiesJson;

  static bestiary: { [key: string]: Partial<Unit> } = {
    ...(units as { [key: string]: Partial<Unit> }),
    ...(folks as { [key: string]: Partial<Unit> }),
  };

  static counts: { [seriesName: string]: number } = {};
  static id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = this.counts[seriesName] || 0;
    this.counts[seriesName] = count + 1;
    return count === 0 ? "" : count.toString();
  }

  static unit(beast: string): Unit {
    let u = {
      id: beast + this.id(beast),
      type: beast,
      pos: { x: 0, y: 0 }, // Default position, will be overridden when placing
      intendedMove: { x: 0, y: 0 },
      state: "idle" as UnitState,
      team: "neutral" as const, // Default team
      ...this.bestiary[beast],
      hp: this.bestiary[beast]?.hp || 10, // Default HP if not specified
      maxHp: this.bestiary[beast]?.hp || 10,
      abilities: this.bestiary[beast]?.abilities || [],
      sprite: this.bestiary[beast]?.sprite || beast,
      mass: this.bestiary[beast]?.mass || 1,
      dmg: this.bestiary[beast]?.dmg || 1, // Default
      meta: { ...(this.bestiary[beast]?.meta || {}) }, // Deep clone meta to avoid shared state
      tags: [
        ...(this.bestiary[beast]?.tags || []), // Include tags from bestiary
        ...(beast === "worm" ? ["swarm"] : []),
        ...(beast === "farmer" ? ["hunt"] : []),
        ...(beast === "soldier" ? ["hunt"] : []),
      ],
    };

    if (!u.meta) {
      u.meta = {};
    }


    if (u.abilities && u.abilities.length > 0) {
      const compiledTriggers: { [expression: string]: Function } = {};

      for (const abilityName of u.abilities) {
        const ability = this.abilities[abilityName];
        if (ability?.trigger) {
          try {


            const triggerFn = new Function(
              "self",
              "context",
              "allUnits",
              `const closest = { 
                enemy: () => {
                  let result = null;
                  let minDist = Infinity;
                  for (const u of allUnits) {
                    if (u.team !== self.team && u.state !== "dead") {
                      const dx = u.pos.x - self.pos.x;
                      const dy = u.pos.y - self.pos.y;
                      const dist = dx * dx + dy * dy;
                      if (dist < minDist) {
                        minDist = dist;
                        result = u;
                      }
                    }
                  }
                  return result;
                }
              };
              const distance = (target) => {
                if (!target) return Infinity;
                const t = target.pos || target;
                const dx = t.x - self.pos.x;
                const dy = t.y - self.pos.y;
                return Math.sqrt(dx * dx + dy * dy);
              };
              return ${ability.trigger};`,
            );
            compiledTriggers[ability.trigger] = triggerFn;
          } catch (e) {

          }
        }
      }

      if (Object.keys(compiledTriggers).length > 0) {
        u.meta.compiledTriggers = compiledTriggers;
      }
    }

    return u;
  }
}
