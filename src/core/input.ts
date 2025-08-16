import Encyclopaedia from "../dmg/encyclopaedia";
import Renderer from "./renderer";
import { SceneLoader } from "./scene_loader";
import { Simulator } from "./simulator";

export default class Input {
  numBuffer: string = "";
  commandBuffer: string = "";
  bufferingCommands: boolean = false;
  static beastKeys = SceneLoader.defaultLegend;
  constructor(
    private sim: Simulator,
    private renderer: Renderer,
  ) {}

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

    if (e.key === "\\") {
      this.bufferingCommands = true;
      this.commandBuffer = "";
      this.numBuffer = "";
      return;
    }

    if (e.key.match(/[0-9]/)) {
      this.numBuffer += e.key;
      return;
    }

    let repetitions = parseInt(this.numBuffer, 10) || 1; // Default to 1 if no number
    this.numBuffer = ""; // Reset buffer after using it

    for (let i = 0; i < repetitions; i++) {
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
      return;
    } else if (e.key === "Enter") {
      if (this.sim.paused) {
        this.sim.paused = false;
      }
      return;
    }

    if (e.key === "c" || e.key === "C") {
      this.renderer.setViewMode(this.renderer.gridView ? "iso" : "grid");
    }

    let beasts = Input.beastKeys;
    if (Object.keys(beasts).some((b) => b === e.key)) {
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

  randomGridPosition(): { x: number; y: number } {
    return {
      x: Math.floor(Simulator.rng.random() * this.sim.fieldWidth),
      y: Math.floor(Simulator.rng.random() * this.sim.fieldHeight),
    };
  }
}
