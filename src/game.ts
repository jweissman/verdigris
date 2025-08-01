import { Simulator } from "./simulator";
// @ts-ignore
import worm from "./assets/sprites/worm.png";
// @ts-ignore
import soldier from "./assets/sprites/soldier.png";
// @ts-ignore
import farmer from "./assets/sprites/farmer.png";
import Renderer from "./renderer";

class Game {
  public sim: Simulator;
  private lastSimTime: number = 0;
  private simTickRate: number = 8; // Simulation runs at 8fps for strategic gameplay

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private sprites: Map<string, HTMLImageElement> = new Map();

  private addInputListener: (cb: (e: { key: string }) => void) => void;
  private animationFrame: (cb: () => void) => void;

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

    // console.log('Game constructor called with canvas:', canvas);
    let width = 128;
    if (this.canvas) {
      width = this.canvas.width / 8; // 8 pixels per grid cell
    }
    let height = 128;
    if (this.canvas) {
      height = this.canvas.height / 8; // 8 pixels per grid cell
    }
    // console.log(`Initializing game with field size: ${width}x${height}`);
    this.sim = new Simulator(width, height);
    
    // Load sprites
    this.loadSprites();

    this.renderer = new Renderer(width, height, this.canvas, this.ctx, this.sim, this.sprites);
  }

  private loadSprites(): void {
    // Only load sprites in browser environment
    if (typeof Image === 'undefined') {
      console.log('Skipping sprite loading in headless environment');
      return;
    }

    const spriteList = [
      { name: 'worm', src: worm }, //'/worm.png' },
      { name: 'soldier', src: soldier }, //'/soldier.png' }
      { name: 'farmer', src: farmer },
    ];

    spriteList.forEach(({ name, src }) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Loaded sprite: ${name}`);
        this.sprites.set(name, img);
      };
      img.onerror = () => {
        console.error(`Failed to load sprite: ${src}`);
      };
      img.src = src;
    });
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

  lastStep: number = 0;
  update() {
    const now = Date.now();
    
    // Simulation runs at 8fps (every 125ms)
    const simTickInterval = 1000 / this.simTickRate; // 125ms for 8fps
    if (now - this.lastSimTime >= simTickInterval) {
      this.sim.step();
      this.lastSimTime = now;
    }
    
    // Animation and rendering run at 60fps
    // this.animationTime += 16; // ~16ms per frame at 60fps
    // this.updateMovementInterpolations();
    this.drawFrame();
  }

  
  drawFrame() {
    if (!this.canvas || !this.ctx) return;
    this.renderer.draw()
  }
}

export { Game };

console.log('Game module loaded.');
