import type { TickContext } from "../core/tick_context";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

export default class DSL {
  static evaluate(
    expression: string,
    subject: Unit,
    context: TickContext,
    target?: any,
  ): any {
    let allies = () =>
      context
        .getAllUnits()
        .filter(
          (u) =>
            u.team === subject.team &&
            u.state !== "dead" &&
            u.id !== subject.id,
        );
    let enemies = () =>
      context
        .getAllUnits()
        .filter((u) => u.team !== subject.team && u.state !== "dead");
    let all = () => context.getAllUnits().filter((u) => u.state !== "dead");

    let distance = (target: Vec2 | Unit | null) => {
      if (!target) return Infinity;
      const pos = (target as Unit).pos || (target as Vec2);
      return Math.sqrt(
        Math.pow(subject.pos.x - pos.x, 2) + Math.pow(subject.pos.y - pos.y, 2),
      );
    };

    let byDistance = (a: Unit, b: Unit) => distance(a) - distance(b);
    let byHealth = (a: Unit, b: Unit) => a.hp - b.hp;
    let byMaxHealth = (a: Unit, b: Unit) => b.hp - a.hp;
    let byHealthPercent = (a: Unit, b: Unit) => a.hp / a.maxHp - b.hp / b.maxHp;

    let wounded = (u: Unit) => u.hp < u.maxHp;
    let within_range = (range: number) => (u: Unit) => distance(u) <= range;

    let closest = {
      ally: () => allies().sort(byDistance)[0] || null,
      enemy: () => enemies().sort(byDistance)[0] || null,
    };

    let weakest = {
      ally: () => allies().sort(byHealth)[0] || null,
      enemy: () => enemies().sort(byHealth)[0] || null,
    };

    let strongest = {
      ally: () => allies().sort(byMaxHealth)[0] || null,
      enemy: () => enemies().sort(byMaxHealth)[0] || null,
    };

    let healthiest = {
      ally: () => allies().sort((a, b) => byHealthPercent(b, a))[0] || null,
      enemy: () => enemies().sort((a, b) => byHealthPercent(b, a))[0] || null,
      enemy_in_range: (range: number) =>
        enemies().filter(within_range(range)).sort(byMaxHealth)[0] || null,
    };

    let nearest = closest;
    let furthest = {
      ally: () => allies().sort((a, b) => byDistance(b, a))[0] || null,
      enemy: () => enemies().sort((a, b) => byDistance(b, a))[0] || null,
    };
    let farthest = furthest;

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
