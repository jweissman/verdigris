import Encyclopaedia from "./dmg/encyclopaedia";
import { Game } from "./game";

class Freehold extends Game {
  // Override input: spawn a worm at a random grid position on 'w'
  numBuffer: string = "";
  getInputHandler(): (e: { key: string }) => void {
    return (e) => {
      if (e.key.match(/[0-9]/)) {
        this.numBuffer += e.key;
        console.log(`Buffering number: ${this.numBuffer}`);
        return;
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
    
    if(e.key === "c" || e.key === "C") {
      this.renderer.setViewMode(
        this.renderer.cinematicView ? 'grid' : 'cinematic'
      );
    }

    let beasts = {
      w: "worm",
      f: "farmer",
      s: "soldier",
      r: "ranger",
      p: "priest",
      b: "bombardier",
      t: "tamer",
      q: "squirrel",
      Q: "megasquirrel",
      z: "rainmaker",
      d: "demon",
      g: "ghost",
      m: "mimic-worm",
      k: "skeleton",
      W: "big-worm", 

    }
    console.log(`Available beasts: ${Object.values(beasts).join(", ")}`);
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
      x: Math.floor(Math.random() * this.sim.fieldWidth),
      y: Math.floor(Math.random() * this.sim.fieldHeight)
    };
  }

  static boot(
    canvasId: string | HTMLCanvasElement = 'battlefield'
  ) {
    let game: Freehold | null = null;
    const canvas = canvasId instanceof HTMLCanvasElement
      ? canvasId
      : document.getElementById(canvasId) as HTMLCanvasElement;
    console.log('Canvas element:', canvas);
    if (canvas) {
      let addInputListener = (cb: (e: { key: string }) => void) => {
        document.addEventListener('keydown', (e) => {
          cb({ key: e.key });
        });
      };

      game = new Freehold(canvas, {
        addInputListener,
        animationFrame: (cb) => requestAnimationFrame(cb)
      });
            
      // Handle window resize
      window.addEventListener('resize', () => {
        if (game && game.handleResize) {
          game.handleResize();
        }
      });
      
      // Initial size calculation
      if (game && game.handleResize) {
        game.handleResize();
      }
    } else {
      console.error(`Canvas element ${canvasId} not found!`);
    }
    console.log('Game initialized:', game);
    function gameLoop() {
      if (game) { game.update(); }
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
}

export { Freehold };


console.log('Freehold module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Freehold = Freehold; // Expose for browser use
}