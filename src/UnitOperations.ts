import { Unit } from "./sim/types";


export class UnitOperations {
  static move(unit: Unit, deltaTime: number = 1, sim?: any): Unit {
    // console.log(`Moving unit ${unit.id} at (${unit.pos.x}, ${unit.pos.y}) with intendedMove (${unit.intendedMove.x}, ${unit.intendedMove.y})`);
    let x = unit.pos.x + unit.intendedMove.x * deltaTime;
    let y = unit.pos.y + unit.intendedMove.y * deltaTime;

    // Clamp position within bounds if sim is provided
    if (sim && typeof sim.fieldWidth === 'number' && typeof sim.fieldHeight === 'number') {
      x = Math.max(0, Math.min(x, sim.fieldWidth - 1));
      y = Math.max(0, Math.min(y, sim.fieldHeight - 1));
    }

    // console.log(`Unit ${unit.id} moved to (${x}, ${y})`);

    return {
      ...unit,
      intendedMove: { x: 0, y: 0 }, // Reset intended move after applying
      pos: {
        x,
        y
      }
    }; //, null];
  }

  static wander(unit: Unit): Unit {
    // if (Math.random() > 0.15) {
    //   return unit;
    // }

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    // console.log(`Wandering unit ${unit.id} at (${unit.pos.x}, ${unit.pos.y}) with new velocity (${dir.x}, ${dir.y})`);
    return {
      ...unit,
      intendedMove: { x: dir.x, y: dir.y }
    };
  }

  static hunt(unit: Unit, sim: any): Unit {
    // Find nearest hostile unit
    const hostiles = sim.units.filter((u: Unit) => 
      u.team !== unit.team && u.state !== 'dead'
    );
    if (hostiles.length === 0) {
      // console.log(`🕵️ ${unit.sprite} found no hostiles to hunt`);
      // No hostiles, just wander
      return unit;  //UnitOperations.wander(unit);
    }
    // Find closest hostile
    let closest = hostiles[0];
    let closestDist = Math.abs(closest.pos.x - unit.pos.x) + Math.abs(closest.pos.y - unit.pos.y);
    for (const hostile of hostiles) {
      const dist = Math.abs(hostile.pos.x - unit.pos.x) + Math.abs(hostile.pos.y - unit.pos.y);
      if (dist < closestDist) {
        closest = hostile;
        closestDist = dist;
      }
    }
    // Move toward closest hostile along the axis with the greatest distance
    const dxRaw = closest.pos.x - unit.pos.x;
    const dyRaw = closest.pos.y - unit.pos.y;
    let dx = 0, dy = 0;
    if (Math.abs(dxRaw) > Math.abs(dyRaw)) {
      dx = dxRaw > 0 ? 1 : -1;
    } else if (Math.abs(dyRaw) > 0) {
      dy = dyRaw > 0 ? 1 : -1;
    } else if (Math.abs(dxRaw) > 0) {
      dx = dxRaw > 0 ? 1 : -1;
    }
    // console.log(`🎯 ${unit.sprite} hunting ${closest.sprite}: moving (${dx},${dy})`);
    return {
      ...unit,
      posture: 'pursue',
      intendedMove: { x: dx, y: dy }
    };
  }

  static swarm(unit: Unit, sim: any, proximity: number = 128): Unit {
    // Find all living allies (except self)
    const allies = sim.units.filter((u: Unit) => 
      u.team === unit.team && u.id !== unit.id && u.state !== 'dead'
    );
    if (allies.length === 0) {
      // No allies, just wander
      return UnitOperations.wander(unit);
    }
    // Calculate center of mass of all allies
    let avgX = 0, avgY = 0;
    for (const ally of allies) {
      avgX += ally.pos.x;
      avgY += ally.pos.y;
    }
    avgX /= allies.length;
    avgY /= allies.length;
    // Move towards center of mass (rounded to nearest int for stability)
    let dx = 0, dy = 0;
    if (Math.abs(avgX - unit.pos.x) >= 1) dx = avgX > unit.pos.x ? 1 : -1;
    if (Math.abs(avgY - unit.pos.y) >= 1) dy = avgY > unit.pos.y ? 1 : -1;
    // If both dx and dy are nonzero, pick one randomly for grid movement
    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) dy = 0;
      else dx = 0;
    }
    // Fallback: if (0,0), wander
    if (dx === 0 && dy === 0) {
      // console.log(`🐛 ${unit.sprite} swarming: at centroid, fallback to wander`);
      return UnitOperations.wander(unit);
    }
    // console.log(`🐛 ${unit.sprite} swarming: moving (${dx},${dy}) towards centroid of ${allies.length} allies`);
    return {
      ...unit,
      intendedMove: { x: dx, y: dy }
    };
  }
}
