import { Rule } from "./rule";
import { Unit } from "../types/Unit";

// This rule interprets posture/tags and sets intendedMove for each unit
export class UnitBehavior extends Rule {
  apply = () => {
    (this.sim.units as Unit[]).forEach(unit => {
      if (unit.state === 'dead' || unit.hp == 0) return;

      const find_new_target = () => {
        // find closest hostile
        const hostiles = this.sim.getRealUnits().filter(u => u.team !== unit.team && u.state !== 'dead');
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
        const friends = this.sim.getRealUnits().filter(u => u.team === unit.team && u.state !== 'dead');
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
        // Queue posture update
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { posture: 'wait' }
          }
        });
        return;
      }
      let target = this.sim.creatureById(targetId);
      
      // Queue target update
      if (targetId !== unit.intendedTarget) {
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { intendedTarget: targetId }
          }
        });
      }
      
      if (target && target.state === 'dead') {
        // Clear dead target
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { intendedTarget: undefined }
          }
        });
        target = undefined;
      }

      let protecteeId = unit.intendedProtectee || find_new_protectee(); // etc
      if (protecteeId && protecteeId !== unit.intendedProtectee) {
        // Queue protectee update
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { intendedProtectee: protecteeId }
          }
        });
      }
      if (unit.posture === 'guard' && !unit.intendedProtectee) {
        const newProtectee = find_new_protectee();
        if (newProtectee) {
          this.sim.queuedCommands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: { intendedProtectee: newProtectee }
            }
          });
        }
      }
      const finalProtectee = protecteeId || unit.intendedTarget;
      if (finalProtectee !== unit.intendedProtectee) {
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { intendedProtectee: finalProtectee }
          }
        });
      }

      // Calculate intended move based on posture
      let intendedMove = { x: 0, y: 0 };
      
      switch (unit.posture) {
        case 'wait': 
          intendedMove = { x: 0, y: 0 };
          this.sim.queuedCommands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: { target: undefined }
            }
          });
          break;

        case 'guard':
          if (unit.intendedProtectee) {
            const protectee = this.sim.creatureById(unit.intendedProtectee);
            if (protectee && protectee.state !== 'dead') {
              // Move towards protectee
              intendedMove = {
                x: protectee.pos.x > unit.pos.x ? 1 : -1,
                y: protectee.pos.y > unit.pos.y ? 1 : -1
              };
            } else {
              // No valid protectee, just wait
              intendedMove = { x: 0, y: 0 };
            }
          } else {
            // No protectee, just wait
            intendedMove = { x: 0, y: 0 };
          }
          break;

        case 'bully': // try to occupy _same space_ as target
          if (target) {
            intendedMove = {
              x: target.pos.x === unit.pos.x ? 0 : (target.pos.x > unit.pos.x ? 1 : -1),
              y: target.pos.y === unit.pos.y ? 0 : (target.pos.y > unit.pos.y ? 1 : -1)
            };
          }
          break;
          
        case 'pursue':
          if (target) {
            intendedMove = {
              x: target.pos.x > unit.pos.x ? 1 : -1,
              y: target.pos.y > unit.pos.y ? 1 : -1
            };
          }
          break;
      }
      
      // Queue move command if intended move is different
      if (intendedMove.x !== 0 || intendedMove.y !== 0) {
        this.sim.queuedCommands.push({
          type: 'move',
          params: {
            unitId: unit.id,
            dx: intendedMove.x,
            dy: intendedMove.y
          }
        });
      }
    });
  }
}
