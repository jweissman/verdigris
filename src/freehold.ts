import { Game } from "./game";

// Scenario/DSL layer for test-driven and scenario-driven setup
class Freehold extends Game {
  get fieldWidth() {
    return this.sim.fieldWidth;
  }
  get fieldHeight() {
    return this.sim.fieldHeight;
  }

  // Override input: spawn a worm at a random grid position on 'w'
  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      if (e.key === "w") {
        const { x, y } = this.randomGridPosition();
        console.log(`Spawning worm at (${x}, ${y})`);
        this.addWorm(x, y);
      } else if (e.key === "f") {
        const { x, y } = this.randomGridPosition();
        console.log(`Spawning farmer at (${x}, ${y})`);
        this.addFarmer(x, y);
      }
    };
  }

  randomGridPosition(): { x: number, y: number } {
    console.log(`Generating random grid position within bounds (${this.fieldWidth}, ${this.fieldHeight})`);
    return {
      x: Math.floor(Math.random() * this.fieldWidth),
      y: Math.floor(Math.random() * this.fieldHeight)
    };
  }

  addWorm(x: number, y: number, tags: string[] = ["swarm"]): string {
    console.log(`Adding worm at (${x}, ${y}) with tags: ${tags.join(", ")}`);
    // Prevent duplicate placement
    if (this.sim.units.some(u => u.pos.x === x && u.pos.y === y)) {
      // throw new Error(`Cannot place worm at (${x}, ${y}): position already occupied`);
      return '';
    }
    let id = "worm" + this.id("worm");
    this.sim.addUnit({
      // id: "worm" + this.id("worm"), //Date.now() + Math.random(),
      id,
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle",
      hp: 20, // Tougher worms for longer battles
      maxHp: 20,
      mass: 1,
      tags
    });
    return id;
  }

  counts: { [seriesName: string]: number } = {}
  id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = (this.counts[seriesName] || 0);
    this.counts[seriesName] = count + 1;
    return count || "";
  }

  addFarmer(x: number, y: number, tags: string[] = ["hunt"]): string {
    console.log(`Adding farmer at (${x}, ${y}) with tags: ${tags.join(", ")}`);
    // Prevent duplicate placement
    if (this.sim.units.some(u => u.pos.x === x && u.pos.y === y)) {
      throw new Error(`Cannot place farmer at (${x}, ${y}): position already occupied`);
      // return '';
    }
    let id = "farmer" + this.id("farmer"); //Date.now() + Math.random();
    this.sim.addUnit({
      // id: "farmer" + this.id("farmer"), //Date.now() + Math.random(),
      id,
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      team: "friendly", // Opposite of worms!
      sprite: "soldier", // Use soldier sprite for farmers
      state: "idle",
      hp: 25, // Tough farmers for epic battles
      maxHp: 25,
      mass: 1,
      tags
    });
    return id;
  }

  // Try to move a unit by (dx, dy). Returns true if moved, false if blocked.
  tryMove(unit, dx, dy) {
    if (!unit) {
      console.log('[tryMove] No unit provided');
      return false;
    }
    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;
    console.log(`[tryMove] Attempt: ${unit.id} from (${unit.pos.x},${unit.pos.y}) to (${newX},${newY})`);
    // Field bounds
    if (newX < 0 || newX >= this.fieldWidth || newY < 0 || newY >= this.fieldHeight) {
      console.log(`[tryMove] Out of bounds: (${newX},${newY})`);
      return false;
    }
    // Check for unit at destination
    const blocker = this.sim.units.find(u => u !== unit && u.pos.x === newX && u.pos.y === newY);
    if (!blocker) {
      console.log(`[tryMove] Move allowed: (${unit.pos.x},${unit.pos.y}) -> (${newX},${newY})`);
      unit.pos.x = newX;
      unit.pos.y = newY;
      this._debugUnits();
      return true;
    }
    console.log(`[tryMove] Blocked by unit at (${newX},${newY}) [${blocker.id}]`);
    // Try to push the blocker in the same direction ONLY if the next cell is empty
    const pushX = blocker.pos.x + dx;
    const pushY = blocker.pos.y + dy;
    if (pushX < 0 || pushX >= this.fieldWidth || pushY < 0 || pushY >= this.fieldHeight) {
      console.log(`[tryMove] Cannot push: push target out of bounds (${pushX},${pushY})`);
      return false;
    }
    const nextCellOccupied = this.sim.units.some(u => u !== blocker && u.pos.x === pushX && u.pos.y === pushY);
    if (nextCellOccupied) {
      console.log(`[tryMove] Cannot push: cell (${pushX},${pushY}) is occupied`);
      this._debugUnits();
      return false;
    }
    // Push the blocker
    console.log(`[tryMove] Pushing unit ${blocker.id} from (${blocker.pos.x},${blocker.pos.y}) to (${pushX},${pushY})`);
    blocker.pos.x = pushX;
    blocker.pos.y = pushY;
    // Now move the original unit
    unit.pos.x = newX;
    unit.pos.y = newY;
    this._debugUnits();
    return true;
  }

  _debugUnits() {
    console.log('[debugUnits] Current unit positions:');
    for (const u of this.sim.units) {
      console.log(`  ${u.id}: (${u.pos.x},${u.pos.y})`);
    }
  }
}

export { Freehold };


console.log('Freehold module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Freehold = Freehold; // Expose for browser use
}