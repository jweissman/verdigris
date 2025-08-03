import { Unit, Vec2 } from "../sim/types";
import { Simulator } from "../simulator";

export default class DSL {
  static evaluate(expression: string, subject: Unit, sim: Simulator): any {
    let random = {
      position: () => ({
        x: Math.round(Math.random() * sim.fieldWidth),
        y: Math.round(Math.random() * sim.fieldHeight)
      }),
      enemy: () => {
        const enemies = sim.units.filter(u => u.team !== subject.team && u.state !== 'dead');
        if (enemies.length === 0) return null;
        return enemies[Math.floor(Math.random() * enemies.length)];
      }
    };

    let closest = {
      enemy: () => {
        const enemies = sim.units.filter(u => u.team !== subject.team && u.state !== 'dead');
        if (enemies.length === 0) return null;
        enemies.sort((a, b) => {
          const distA = Math.abs(a.pos.x - subject.pos.x) + Math.abs(a.pos.y - subject.pos.y);
          const distB = Math.abs(b.pos.x - subject.pos.x) + Math.abs(b.pos.y - subject.pos.y);
          return distA - distB;
        });
        return enemies[0];
      }
    }

    let furthest = {
      enemy: () => {
        const enemies = sim.units.filter(u => u.team !== subject.team && u.state !== 'dead');
        if (enemies.length === 0) return null;
        enemies.sort((a, b) => {
          const distA = Math.abs(a.pos.x - subject.pos.x) + Math.abs(a.pos.y - subject.pos.y);
          const distB = Math.abs(b.pos.x - subject.pos.x) + Math.abs(b.pos.y - subject.pos.y);
          return distB - distA;
        });
        return enemies[0];
      }
    }

    let distance = (target: Vec2) => {
      if (!target) return Infinity;
      return Math.sqrt(
        Math.pow(subject.pos.x - target.x, 2) +
        Math.pow(subject.pos.y - target.y, 2)
      );
    };

    let unit = (id: string) => {
      return sim.roster[id] || null;
    };

    let ret = eval(expression);
    if (ret === undefined || ret === null) {
      // console.warn(`DSL evaluation returned undefined for expression: ${expression}`);
      return null;
    }

    // console.debug(`"${expression}" [for subject ${subject.id}] =>`, ret);
    return ret;
  }
}