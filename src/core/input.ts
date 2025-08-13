import Encyclopaedia from "../dmg/encyclopaedia";
import Renderer from "./renderer";
import { Simulator } from "./simulator";

export default class Input {
  numBuffer: string = "";
  commandBuffer: string = "";
  bufferingCommands: boolean = false;

  constructor(private sim: Simulator, private renderer: Renderer) {
    // this.handleKeyPress = this.handleKeyPress.bind(this);
    // document.addEventListener('keydown', this.handleKeyPress);
  }
  
  handle(e: { key: string }) {
    if (this.bufferingCommands) {
      if (e.key === "Escape") {
        this.commandBuffer = "";
        this.numBuffer = "";
        this.bufferingCommands = false;
        return;
      } else if (e.key === "Enter") {
        this.bufferingCommands = false;
        this.sim.parseCommand(this.commandBuffer);
        this.commandBuffer = "";
        this.numBuffer = "";
        return;
      } else {
        this.commandBuffer += e.key;
        return;
      }
    }

    // if \ is pressed, start buffering commands
    if (e.key === "\\") {
      this.bufferingCommands = true;
      this.commandBuffer = "";
      this.numBuffer = "";
      return;
    }

    // if (e.key === "Escape") {
    //   this.commandBuffer = "";
    //   this.numBuffer = "";
    //   return;
    // } else
    if (e.key.match(/[0-9]/)) {
      this.numBuffer += e.key;
      return;
    }

    let repetitions = parseInt(this.numBuffer, 10) || 1; // Default to 1 if no number
    this.numBuffer = ""; // Reset buffer after using it

    for (let i = 0; i < repetitions; i++) {
      // this.handleKeyPress(e);
      this.handleKeyPress(e);
    }
  }


  private handleKeyPress(e: { key: string }) {

    if (e.key === "Escape") {
      this.sim.reset();
      return;
    } else if (e.key === ".") {
      this.sim.step(true);
      return;
    } else if (e.key === ",") {
      this.sim.pause();
      return
    } else if (e.key === "Enter") {
      if (this.sim.paused) {
        this.sim.paused = false;
      }
      return;
    }
    
    if(e.key === "c" || e.key === "C") {
      this.renderer.setViewMode(
        this.renderer.gridView ? 'iso' : 'grid'
      );
    }

    let beasts = {
      a: "toymaker",
      b: "bombardier",
      d: "demon",
      D: "desert-megaworm",
      f: "farmer",
      g: "ghost",
      G: "grappler",
      k: "skeleton",
      m: "mimic-worm",
      p: "priest",
      Q: "megasquirrel",
      q: "squirrel",
      r: "ranger",
      s: "soldier",
      t: "tamer",
      W: "big-worm", 
      w: "worm",
      z: "rainmaker",

      e: "mechatronist",
      T: "mechatron",
    }
    if (Object.keys(beasts).some(b => b === e.key)) {
      const { x, y } = this.randomGridPosition();

      let beast = beasts[e.key];
      if (beast) {
        this.add(beast, x, y);
      }
    }
  }

  add(beast: string, x: number, y: number) {
    this.sim.addUnit({ ...Encyclopaedia.unit(beast), pos: { x, y } });
  }

  randomGridPosition(): { x: number, y: number } {
    return {
      x: Math.floor(Simulator.rng.random() * this.sim.fieldWidth),
      y: Math.floor(Simulator.rng.random() * this.sim.fieldHeight)
    };
  }
}