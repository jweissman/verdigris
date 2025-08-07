import { Unit } from "./sim/types";
import { Simulator } from "./simulator";


export class UnitOperations {
  static move(unit: Unit, deltaTime: number = 1, sim?: any): Unit {
    // Update facing direction based on intended movement
    let facing = unit.meta.facing || 'right'; // Default to right
    if (unit.intendedMove.x > 0) {
      facing = 'right';
    } else if (unit.intendedMove.x < 0) {
      facing = 'left';
    }
    // Don't change facing for purely vertical movement
    
    // Apply chill effects - slow movement
    let effectiveDeltaTime = deltaTime;
    if (unit.meta.chilled) {
      const slowFactor = 1 - (unit.meta.chillIntensity || 0.5);
      effectiveDeltaTime *= slowFactor;
      // console.log(`${unit.id} is chilled, moving at ${slowFactor * 100}% speed`);
    }
    
    // Apply stun effects - completely prevent movement
    if (unit.meta.stunned) {
      effectiveDeltaTime = 0;
    }
    
    // console.log(`Moving unit ${unit.id} at (${unit.pos.x}, ${unit.pos.y}) with intendedMove (${unit.intendedMove.x}, ${unit.intendedMove.y})`);
    let x = unit.pos.x + unit.intendedMove.x * effectiveDeltaTime;
    let y = unit.pos.y + unit.intendedMove.y * effectiveDeltaTime;

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
      },
      meta: {
        ...unit.meta,
        facing
      }
    }; //, null];
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
      intendedMove: { x: dir.x, y: dir.y }
    };
  }

  static hunt(unit: Unit, sim: any): Unit {
    // Find nearest hostile unit
    const hostiles = sim.getRealUnits().filter((u: Unit) => 
      u.team !== unit.team && u.state !== 'dead'
    );
    if (hostiles.length === 0) {
      // console.log(`🕵️ ${unit.sprite} found no hostiles to hunt`);
      // No hostiles, just wander
      return unit;  //UnitOperations.wander(unit);
    }
    
    // Aggressive units (like clanker) seek enemy groups, not just closest
    if (unit.tags && unit.tags.includes('aggressive')) {
      return UnitOperations.huntAggressively(unit, hostiles, sim);
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

  static huntAggressively(unit: Unit, hostiles: Unit[], sim: any): Unit {
    // Aggressive units seek the center of enemy groups for maximum explosion impact
    if (hostiles.length === 0) return unit;
    
    // Calculate enemy centroid (center of mass)
    let totalX = 0, totalY = 0;
    for (const enemy of hostiles) {
      totalX += enemy.pos.x;
      totalY += enemy.pos.y;
    }
    const centerX = totalX / hostiles.length;
    const centerY = totalY / hostiles.length;
    
    // Move toward enemy center with double speed for aggression
    let dx = 0, dy = 0;
    const dxRaw = centerX - unit.pos.x;
    const dyRaw = centerY - unit.pos.y;
    
    // Prioritize the largest axis movement for aggressive rushing
    if (Math.abs(dyRaw) > Math.abs(dxRaw)) {
      dy = dyRaw > 0 ? 1 : -1;
      // Sometimes also move diagonally for more aggressive pathing
      if (Math.abs(dxRaw) > 0.5 && Math.random() < 0.7) {
        dx = dxRaw > 0 ? 1 : -1;
      }
    } else if (Math.abs(dxRaw) > 0) {
      dx = dxRaw > 0 ? 1 : -1;
      if (Math.abs(dyRaw) > 0.5 && Math.random() < 0.7) {
        dy = dyRaw > 0 ? 1 : -1;
      }
    }
    
    console.log(`🔥 ${unit.id} aggressively rushing toward enemy center at (${Math.floor(centerX)}, ${Math.floor(centerY)})`);
    
    return {
      ...unit,
      posture: 'berserk',
      intendedMove: { x: dx, y: dy }
    };
  }

  static swarm(unit: Unit, sim: Simulator): Unit {
    if (Math.random() < 0.15) {
      return unit;
    }

    // Find all living allies (except self)
    const allies = sim.getRealUnits().filter((u: Unit) => 
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
