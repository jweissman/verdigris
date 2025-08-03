import { Game } from "./game";
import { Ability, Unit } from "./sim/types";

// Scenario/DSL layer for test-driven and scenario-driven setup
class Freehold extends Game {
  static abilities: { [key: string]: Ability } = {
    jumps: {
      name: 'Hurl Self',
      cooldown: 100,
      config: {
        height: 5, speed: 2, impact: { radius: 3, damage: 5 }, duration: 10,
      },
      target: 'closest.enemy()?.pos',
      trigger: 'distance(closest.enemy()?.pos) > 10',
      effect: (u, t) => {
        if (!t) {
          // console.warn(`${u.id} has no valid target to jump to`);
          return;
        }
        console.debug(`${u.id} jumping to target at (${t.x}, ${t.y})`);
        u.meta.jumping = true;
        u.meta.jumpProgress = 0;
        u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
        u.meta.jumpTarget = t;
      },
    },
  }

  static bestiary: { [key: string]: Partial<Unit> } = {
    worm: {
      intendedMove: { x: 0, y: 0 },
      team: "hostile",
      sprite: "worm",
      state: "idle",
      hp: 20, // Tougher worms for longer battles
      maxHp: 20,
      mass: 4,
    },
    farmer: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "farmer",
      state: "idle",
      hp: 20,
      maxHp: 20,
      mass: 1,
    },
    soldier: {
      intendedMove: { x: 0, y: 0 },
      team: "friendly",
      sprite: "soldier",
      state: "idle",
      hp: 30,
      maxHp: 30,
      mass: 1,
    }
  }

  
  // Override input: spawn a worm at a random grid position on 'w'
  numBuffer: string = "";
  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      if (e.key.match(/[0-9]/)) {
        this.numBuffer += e.key;
        console.log(`Buffering number: ${this.numBuffer}`);
        return;
      // } else if (e.key === "Enter") {
      //   this.numBuffer = ""; // Reset buffer on Enter
      //   return;
      }
      let repetitions = parseInt(this.numBuffer, 10) || 1; // Default to 1 if no number
      this.numBuffer = ""; // Reset buffer after using it

      for (let i = 0; i < repetitions; i++) {
        this.handleKeyPress(e);
      }
    };
  }

  handleKeyPress(e: { key: string }) {
    if (e.key === "Escape") {
      this.sim.reset();
      return;
    } else if (e.key === ".") {
      console.log("STEPPING MANUALLY");
      this.sim.step(true);
      return;
    } else if (e.key === ",") {
      if (this.sim.paused) {
        console.log(`Simulation is already paused (Enter to unpause).`);
      }
      this.sim.pause();
      return
    } else if (e.key === "Enter") {
      if (this.sim.paused) {
        console.log(`Unpausing simulation (press , to pause again).`);
        this.sim.paused = false;
      } else {
        console.log(`Simulation is running (press , to pause).`);
      }
      return;
    }
    
    if (e.key === "r") {
      this.renderer.setViewMode('grid');
    } else if (e.key === "c") {
      this.renderer.setViewMode('cinematic');
    }

    if (e.key === "w") {
      const { x, y } = this.randomGridPosition();
      console.log(`Spawning worm at (${x}, ${y})`);
      this.addWorm(x, y, ["swarm"]);
      return true;
    } else if (e.key === "f") {
      const { x, y } = this.randomGridPosition();
      console.log(`Spawning farmer at (${x}, ${y})`);
      this.addFarmer(x, y);
      return true;
    } else if (e.key === "s") {
      const { x, y } = this.randomGridPosition();
      console.log(`Spawning soldier at (${x}, ${y})`);
      this.addSoldier(x, y);
      return true;
    } 

    return false;
  }

  randomGridPosition(): { x: number, y: number } {
    return {
      x: Math.floor(Math.random() * this.sim.fieldWidth),
      y: Math.floor(Math.random() * this.sim.fieldHeight)
    };
  }

  addWorm(x: number, y: number, tags: string[] = []): string {
    let id = "worm" + this.id("worm");
    this.sim.addUnit({
      id,
      pos: { x, y },
      tags,
      ...Freehold.bestiary.worm,
      // intendedMove: { x: 0, y: 0 },
      // team: "hostile",
      // sprite: "worm",
      // state: "idle",
      // hp: 20, // Tougher worms for longer battles
      // maxHp: 20,
      // mass: 1,
      abilities: {
        jumps: Freehold.abilities.jumps,
        // {
        //   name: 'Hurl Self',
        //   cooldown: 100,
        //   config: {
        //     height: 5, speed: 2, impact: { radius: 3, damage: 5 }, duration: 10,
        //   },
        //   target: 'closest.enemy()?.pos',
        //   trigger: 'distance(closest.enemy()?.pos) > 10',
        //   effect: (u, t) => {
        //     if (!t) {
        //       console.warn(`${u.id} has no valid target to jump to`);
        //       return;
        //     }
        //     console.log(`${u.id} jumping to target at (${t.x}, ${t.y})`);
        //     u.meta.jumping = true;
        //     u.meta.jumpProgress = 0;
        //     u.meta.jumpOrigin = { x: u.pos.x, y: u.pos.y };
        //     u.meta.jumpTarget = t;
        //   },
        // },
      },
    });
    return id;
  }


  addFarmer(x: number, y: number, tags: string[] = ["hunt"]): string {
    console.log(`Adding farmer at (${x}, ${y}) with tags: ${tags.join(", ")}`);
    let id = "farmer" + this.id("farmer");
    this.sim.addUnit({
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
    let id = "soldier" + this.id("soldier");
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

  private counts: { [seriesName: string]: number } = {}
  protected id(seriesName: string): number | string {
    this.counts = this.counts || {};
    let count = (this.counts[seriesName] || 0);
    this.counts[seriesName] = count + 1;
    return count || "";
  }
}

export { Freehold };


console.log('Freehold module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Freehold = Freehold; // Expose for browser use
}