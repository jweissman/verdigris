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

      const find_new_protectee = () => {
        // find closest friendly
        const friends = this.sim.units.filter(u => u.team === unit.team && u.state !== 'dead');
        if (friends.length === 0) return undefined;
        let closest = friends.reduce((prev, curr) => {
          const prevDist = Math.hypot(prev.pos.x - unit.pos.x, prev.pos.y - unit.pos.y);
          const currDist = Math.hypot(curr.pos.x - unit.pos.x, curr.pos.y - unit.pos.y);
          return currDist < prevDist ? curr : prev;
        });
        return closest.id;
      }

      let targetId = unit.intendedTarget || find_new_target();
      if (!targetId) {
        unit.posture = 'wait';
        return unit;
      }
      let target = this.sim.creatureById(targetId);
      unit.intendedTarget = targetId;
      if (target && target.state === 'dead') {
        unit.intendedTarget = undefined;
        target = undefined;
      }

      let protecteeId = unit.intendedProtectee || find_new_protectee(); // etc
      if (protecteeId) {
        unit.intendedProtectee = protecteeId;
      }
      if (unit.posture === 'guard' && !unit.intendedProtectee) {
        unit.intendedProtectee = find_new_protectee();
      }
      unit.intendedProtectee = unit.intendedProtectee || unit.intendedTarget;

      switch (unit.posture) {
        case 'wait': return { ...unit, intendedMove: { x: 0, y: 0 }, target: undefined };

        case 'guard':
          if (unit.intendedProtectee) {
            const protectee = this.sim.creatureById(unit.intendedProtectee);
            if (protectee && protectee.state !== 'dead') {
              // Move towards protectee
              unit.intendedMove = {
                x: protectee.pos.x > unit.pos.x ? 1 : -1,
                y: protectee.pos.y > unit.pos.y ? 1 : -1
              };
            } else {
              // No valid protectee, just wait
              unit.intendedMove = { x: 0, y: 0 };
            }
          } else {
            // No protectee, just wait
            unit.intendedMove = { x: 0, y: 0 };
          }
          return unit;

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
