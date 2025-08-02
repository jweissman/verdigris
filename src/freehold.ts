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
        this.addWorm(x, y, ["swarm"]);
      } else if (e.key === "f") {
        const { x, y } = this.randomGridPosition();
        console.log(`Spawning farmer at (${x}, ${y})`);
        this.addFarmer(x, y);
      } else if (e.key === "s") {
        const { x, y } = this.randomGridPosition();
        console.log(`Spawning soldier at (${x}, ${y})`);
        this.addSoldier(x, y);
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

  addWorm(x: number, y: number, tags: string[] = []): string {
    // console.log(`Adding worm at (${x}, ${y}) with tags: ${tags.join(", ")}`);
    if (this.sim.unitAt(x, y)) {
      // throw new Error(`Cannot place worm at (${x}, ${y}): position already occupied`);
      return "";
    }
    let id = "worm" + this.id("worm");
    this.sim.addUnit({
      id, //: "worm" + this.id("worm"), //Date.now() + Math.random(),
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle",
      hp: 20, // Tougher worms for longer battles
      maxHp: 20,
      mass: 1,
      tags: tags,
      abilities: { jump: {
        name: "jump",
        cooldown: 10,
        trigger: "true",
        // jumpHeight: 5,
        // jumpSpeed: 1,
        config: {
          jumpHeight: 5,
          jumpSpeed: 1
        },
        effect: (unit) => {
          console.log(`Worm ${unit.id} jumping`);
          unit.meta.jumping = true;
          unit.meta.jumpProgress = 0;
        }
      }},
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
      sprite: "farmer", // Use soldier sprite for farmers
      state: "idle",
      hp: 25, // Tough farmers for epic battles
      mass: 1,
      tags
    });
    return id;
  }

  addSoldier(x: number, y: number, tags: string[] = ["hunt"]): string {
    console.log(`Adding soldier at (${x}, ${y}) with tags: ${tags.join(", ")}`);
    // Prevent duplicate placement
    if (this.sim.units.some(u => u.pos.x === x && u.pos.y === y)) {
      throw new Error(`Cannot place soldier at (${x}, ${y}): position already occupied`);
      // return '';
    }
    let id = "soldier" + this.id("soldier"); //Date.now() + Math.random();
    this.sim.addUnit({
      id,
      pos: { x, y },
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier",
      state: "idle",
      hp: 30, // Tougher soldiers for epic battles
      mass: 1,
      tags
    });
    return id;
  }
}

export { Freehold };


console.log('Freehold module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Freehold = Freehold; // Expose for browser use
}