import { Unit } from "./sim/types";


export class UnitOperations {
  static move(unit: Unit, deltaTime: number = 1, sim?: any): Unit {
    let x = unit.pos.x + unit.vel.x * deltaTime;
    let y = unit.pos.y + unit.vel.y * deltaTime;

    // Clamp position within bounds if sim is provided
    if (sim && typeof sim.fieldWidth === 'number' && typeof sim.fieldHeight === 'number') {
      x = Math.max(0, Math.min(x, sim.fieldWidth - 1));
      y = Math.max(0, Math.min(y, sim.fieldHeight - 1));
    }

    // console.log(`Moving unit ${unit.id} from (${unit.pos.x}, ${unit.pos.y}) to (${x}, ${y}) with velocity (${unit.vel.x}, ${unit.vel.y})`);
    return {
      ...unit,
      pos: {
        x,
        y
      }
    };
  }

  static wander(unit: Unit): Unit {
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
      vel: { x: dir.x, y: dir.y }
    };
  }

  static hunt(unit: Unit, sim: any): Unit {
    // Find nearest hostile unit
    const hostiles = sim.units.filter((u: Unit) => 
      u.team !== unit.team && u.state !== 'dead'
    );
    
    if (hostiles.length === 0) {
      // No hostiles, just wander
      return UnitOperations.wander(unit);
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
    
    // Move towards closest hostile
    let dx = 0, dy = 0;
    if (closest.pos.x > unit.pos.x) dx = 1;
    else if (closest.pos.x < unit.pos.x) dx = -1;
    
    if (closest.pos.y > unit.pos.y) dy = 1;
    else if (closest.pos.y < unit.pos.y) dy = -1;
    
    // If we can only move in one direction (no diagonal), pick randomly between x and y
    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) dy = 0;
      else dx = 0;
    }
    
    console.log(`🎯 ${unit.sprite} hunting ${closest.sprite}: moving (${dx},${dy})`);
    
    return {
      ...unit,
      vel: { x: dx, y: dy }
    };
  }

  static swarm(unit: Unit, sim: any): Unit {
    // Find nearby allies to group with
    const allies = sim.units.filter((u: Unit) => 
      u.team === unit.team && u.id !== unit.id && u.state !== 'dead'
    );
    
    if (allies.length === 0) {
      // No allies, just wander
      return UnitOperations.wander(unit);
    }
    
    // Find the center of mass of nearby allies (within 3 units)
    const nearbyAllies = allies.filter((ally: Unit) => {
      const dist = Math.abs(ally.pos.x - unit.pos.x) + Math.abs(ally.pos.y - unit.pos.y);
      return dist <= 3;
    });
    
    if (nearbyAllies.length === 0) {
      // No nearby allies, wander to find them
      return UnitOperations.wander(unit);
    }
    
    // Calculate center of mass
    let avgX = 0, avgY = 0;
    for (const ally of nearbyAllies) {
      avgX += ally.pos.x;
      avgY += ally.pos.y;
    }
    avgX /= nearbyAllies.length;
    avgY /= nearbyAllies.length;
    
    // Move towards center of mass
    let dx = 0, dy = 0;
    if (avgX > unit.pos.x) dx = 1;
    else if (avgX < unit.pos.x) dx = -1;
    
    if (avgY > unit.pos.y) dy = 1;
    else if (avgY < unit.pos.y) dy = -1;
    
    // If we can only move in one direction, pick randomly
    if (dx !== 0 && dy !== 0) {
      if (Math.random() < 0.5) dy = 0;
      else dx = 0;
    }
    
    console.log(`🐛 ${unit.sprite} swarming: moving (${dx},${dy}) towards ${nearbyAllies.length} allies`);
    
    return {
      ...unit,
      vel: { x: dx, y: dy }
    };
  }
}
