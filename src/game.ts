import { Simulator } from "./simulator";
// @ts-ignore
import worm from "./assets/sprites/worm.png";
// @ts-ignore
import soldier from "./assets/sprites/soldier.png";
// @ts-ignore
import farmer from "./assets/sprites/farmer.png";
import Renderer, { createScaledRenderer } from "./renderer";

class Game {
  public sim: Simulator;
  private lastSimTime: number = 0;
  private simTickRate: number = 8; // Simulation runs at 8fps for strategic gameplay

  private canvas: HTMLCanvasElement;
  renderer: Renderer;
  private _handleResize: () => void;
  private draw: () => void;
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
    this.addInputListener = opts?.addInputListener || (typeof window !== 'undefined' ? (cb) => window.addEventListener("keydown", cb as any) : () => {});
    this.animationFrame = opts?.animationFrame || (typeof window !== 'undefined' ? (cb) => requestAnimationFrame(cb) : () => {});
    this.setupInput();
    this.loop = this.loop.bind(this);
    this.animationFrame(this.loop);

    this.sim = new Simulator(40, 25); // 40×25 grid = 320×200 pixels at 8px per cell
    
    // Load sprites
    this.loadSprites();

    // Create scaled renderer for browser environments
    if (typeof window !== 'undefined' && canvas instanceof HTMLCanvasElement) {
      const scaledRenderer = createScaledRenderer(320, 200, canvas, this.sim, this.sprites);
      this.renderer = scaledRenderer.renderer;
      this._handleResize = scaledRenderer.handleResize;
      this.draw = scaledRenderer.draw;
    } else {
      // Fallback for testing - create basic renderer with mock canvas
      const mockCanvas = { 
        width: 320, 
        height: 200, 
        getContext: () => ({
          clearRect: () => {},
          fillRect: () => {},
          drawImage: () => {},
          save: () => {},
          restore: () => {},
          imageSmoothingEnabled: false
        } as any)
      };
      this.renderer = new Renderer(320, 200, mockCanvas, this.sim, this.sprites);
      this._handleResize = () => {};
      this.draw = () => this.renderer.draw();
    }
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
    // console.log('Draw frame!');
    this.drawFrame();
  }

  
  drawFrame() {
    // console.log('Drawing frame...');
    // let t0 = performance.now();
    this.draw();
    // let t1 = performance.now();
    // let elapsed = t1 - t0;
    // console.log('Frame drawn in ', elapsed, 'ms');
  }

  // Expose resize handling to external code
  handleResize() {
    this._handleResize();
  }
}

export { Game };

console.log('Game module loaded.');
