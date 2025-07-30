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
}
