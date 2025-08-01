import { Rule } from "./rule";

// This rule interprets posture/tags and sets intendedMove for each unit
export class UnitBehavior extends Rule {
  apply = () => {
    this.sim.units = this.sim.units.map(unit => {
      if (unit.state === 'dead' || unit.hp == 0) return unit;

      const find_new_target = () => {
        // find closest hostile
        const hostiles = this.sim.units.filter(u => u.team !== unit.team && u.state !== 'dead');
        if (hostiles.length === 0) return undefined;
        let closest = hostiles.reduce((prev, curr) => {
          const prevDist = Math.hypot(prev.pos.x - unit.pos.x, prev.pos.y - unit.pos.y);
          const currDist = Math.hypot(curr.pos.x - unit.pos.x, curr.pos.y - unit.pos.y);
          return currDist < prevDist ? curr : prev;
        });
        return closest.id;
      }
      let targetId = unit.intendedTarget || find_new_target();
      if (!targetId) {
        unit.posture = 'idle';
        return unit;
      }
      let target = this.sim.creatureById(targetId);
      unit.intendedTarget = targetId;
      switch (unit.posture) {
        case 'idle': return { ...unit, intendedMove: { x: 0, y: 0 }, target: undefined };
        case 'bully': // try to occupy _same space_ as target
          if (target) {
            // console.log(`[UnitBehavior] ${unit.id} in bully posture, moving to occupy target ${target.id} at (${target.pos.x}, ${target.pos.y})`);
            unit.intendedMove = {
              x: target.pos.x === unit.pos.x ? 0 : (target.pos.x > unit.pos.x ? 1 : -1),
              y: target.pos.y === unit.pos.y ? 0 : (target.pos.y > unit.pos.y ? 1 : -1)
            };
          }
          break;
        case 'pursue':
          if (target) {
            unit.intendedMove = {
              x: target.pos.x > unit.pos.x ? 1 : -1,
              y: target.pos.y > unit.pos.y ? 1 : -1
            };
          }
          return unit;
      }

      return unit;

    });
  }
}
