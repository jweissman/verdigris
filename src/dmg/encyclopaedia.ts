import { Abilities } from "../rules/abilities";
import { Unit, UnitState } from "../types/Unit";
import units from "../../data/units.json";

export default class Encyclopaedia {
  static abilities = Abilities.all;

  static bestiary: { [key: string]: Partial<Unit> } = {
    ...units,
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

    return u;
  }
}
