import { Simulator } from "./simulator";

class Game {
  sim: Simulator;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  addInputListener: (cb: (e: { key: string }) => void) => void;
  animationFrame: (cb: () => void) => void;

  constructor(
    canvas: HTMLCanvasElement,
    opts?: {
      addInputListener?: (cb: (e: { key: string }) => void) => void,
      animationFrame?: (cb: () => void) => void
    }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.addInputListener = opts?.addInputListener || (typeof window !== 'undefined' ? (cb) => window.addEventListener("keydown", cb as any) : () => {});
    this.animationFrame = opts?.animationFrame || (typeof window !== 'undefined' ? (cb) => requestAnimationFrame(cb) : () => {});
    this.setupInput();
    this.loop = this.loop.bind(this);
    this.animationFrame(this.loop);

    console.log('Game constructor called with canvas:', canvas);
    let width = 128;
    if (this.canvas) {
      width = this.canvas.width / 8; // 8 pixels per grid cell
    }
    let height = 128;
    if (this.canvas) {
      height = this.canvas.height / 8; // 8 pixels per grid cell
    }
    console.log(`Initializing game with field size: ${width}x${height}`);
    this.sim = new Simulator(width, height);
  }

  setupInput() {
    this.addInputListener(this.getInputHandler());
  }

  // Default input handler: spawn a worm on 'w'
  getInputHandler(): (e: { key: string }) => void {
    return (e) => { console.log(`Key pressed: ${e.key} [default handler]`); };
  }

  loop() {
    this.update();
    this.animationFrame(this.loop);
  }

  update() {
    this.sim.step();
    this.drawFrame();
  }

  drawFrame() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw grid dots
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    for (let x = 0; x < this.canvas.width; x += 8) {
      for (let y = 0; y < this.canvas.height; y += 8) {
        this.ctx.beginPath();
        this.ctx.arc(x + 4, y + 4, 1.5, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#888";
        this.ctx.fill();
      }
    }
    this.ctx.restore();
    // Draw units
    let count = 0;
    for (const unit of this.sim.units) {
      this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
      this.ctx.fillRect((unit.pos.x * 8), (unit.pos.y * 8), 8, 8);
      count++;
    }
    if (count > 0) {
      console.log(`Drawn ${count} units on canvas`);
    } else {
      console.log("No units to draw");
    }
  }
}

export { Game };

console.log('Game module loaded.');
if (typeof window !== 'undefined') {
  window.Game = Game; // Expose for browser use
}