import { Unit, Vec2 } from "../sim/types";
import { Simulator } from "../simulator";

export default class DSL {
  static noun = (
    unit: Unit,
    sim: Simulator,
    sort: {(a: Unit, b: Unit): number} | null = null,
    filter: (unit: Unit) => boolean = (u) => true,
  ) => {
    return {
      ally: () => {
        let allies = sim.getRealUnits().filter(u => u.team === unit.team && u.state !== 'dead' && u.id !== unit.id)
          .filter(filter);
        if (allies.length === 0) return null;
        if (sort) {
          allies.sort(sort);
        }
        return allies[0];
      },
      enemy: () => {
        let enemies = sim.getRealUnits().filter(u => u.team !== unit.team && u.state !== 'dead')
          .filter(filter);
        if (enemies.length === 0) return null;
        if (sort) {
          enemies.sort(sort);
        }
        return enemies[0];
      }
    }
  };

  static evaluate(expression: string, subject: Unit, sim: Simulator): any {
    let random = {
      position: () => ({
        x: Math.round(Math.random() * sim.fieldWidth),
        y: Math.round(Math.random() * sim.fieldHeight)
      }),
      ally: () => {
        const allies = sim.getRealUnits().filter(u => u.team === subject.team && u.state !== 'dead' && u.id !== subject.id);
        if (allies.length === 0) return null;
        return allies[Math.floor(Math.random() * allies.length)];
      },
      enemy: () => {
        const enemies = sim.getRealUnits().filter(u => u.team !== subject.team && u.state !== 'dead');
        if (enemies.length === 0) return null;
        return enemies[Math.floor(Math.random() * enemies.length)];
      }
    };

    let _group = (comparator) => this.noun(subject, sim, comparator);

    let weakest = _group((a, b) => a.hp - b.hp);
    let strongest = _group((a, b) => b.hp - a.hp);
    let healthiest = _group((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp));
    let mostInjured = _group((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));

    let dist2 = (a: Vec2, b: Vec2) => {
      return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2);
    };

    let nearest = _group((a, b) => {
      const distA = dist2(a.pos, subject.pos);
      const distB = dist2(b.pos, subject.pos);
      return distA - distB;
    });
    let closest = nearest;

    let furthest = _group((a, b) => {
      const distA = dist2(a.pos, subject.pos);
      const distB = dist2(b.pos, subject.pos);
      return distB - distA;
    });
    let farthest = furthest;

    // let mostMassive = _group((a, b) => b.mass - a.mass);
    // let leastMassive = _group((a, b) => a.mass - b.mass);

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