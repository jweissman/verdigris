import { Simulator } from "./simulator";
// @ts-ignore
import worm from "./assets/sprites/worm.png";
// @ts-ignore
import soldier from "./assets/sprites/soldier.png";

class Game {
  sim: Simulator;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  addInputListener: (cb: (e: { key: string }) => void) => void;
  animationFrame: (cb: () => void) => void;
  
  // Sprite support
  private sprites: Map<string, HTMLImageElement> = new Map();
  
  // Animation state
  private animationTime: number = 0;
  
  // Movement interpolation - track units that are moving smoothly
  private unitInterpolations: Map<string, {
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    progress: number; // 0 to 1
    duration: number; // total time in ms
  }> = new Map();
  
  // Track previous positions to detect movement
  private previousPositions: Map<string, {x: number, y: number}> = new Map();
  
  // Decouple simulation from rendering
  private lastSimTime: number = 0;
  private simTickRate: number = 8; // Simulation runs at 8fps for strategic gameplay

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
    
    // Load sprites
    this.loadSprites();
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
    this.animationTime += 16; // ~16ms per frame at 60fps
    this.updateMovementInterpolations();
    this.drawFrame();
  }

  private updateMovementInterpolations() {
    const deltaTime = 16; // ~16ms per frame at 60fps
    
    // Check for new movements
    for (const unit of this.sim.units) {
      const prevPos = this.previousPositions.get(unit.id);
      if (!prevPos) {
        // First time seeing this unit, just record position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y });
        continue;
      }
      
      // Check if unit moved
      if (prevPos.x !== unit.pos.x || prevPos.y !== unit.pos.y) {
        const deltaX = unit.pos.x - prevPos.x;
        const deltaY = unit.pos.y - prevPos.y;
        
        // Log movement with context about whether this might be a push
        console.log(`🏃 ${unit.sprite} moved: (${prevPos.x},${prevPos.y}) → (${unit.pos.x},${unit.pos.y}) [Δ${deltaX},${deltaY}]`);
        
        // Unit moved! Start interpolation
        this.unitInterpolations.set(unit.id, {
          startX: prevPos.x,
          startY: prevPos.y,
          targetX: unit.pos.x,
          targetY: unit.pos.y,
          progress: 0,
          duration: 400 // 400ms movement (slower)
        });
        
        // Update previous position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y });
      }
    }
    
    // Update existing interpolations
    for (const [unitId, interp] of this.unitInterpolations.entries()) {
      interp.progress += deltaTime / interp.duration;
      
      if (interp.progress >= 1) {
        // Interpolation complete, remove it
        this.unitInterpolations.delete(unitId);
      }
    }
  }

  private easeInOutQuad(t: number): number {
    // Less smooth, more chunky movement
    // Sharp acceleration at start, then linear
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
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
      // Calculate render position (interpolated if moving)
      let renderX = unit.pos.x;
      let renderY = unit.pos.y;
      
      const interp = this.unitInterpolations.get(unit.id);
      if (interp) {
        // Use smooth interpolation with easing
        const easeProgress = this.easeInOutQuad(interp.progress);
        renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
        renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      }
      
      const pixelX = renderX * 8;
      const pixelY = renderY * 8;
      
      const sprite = this.sprites.get(unit.sprite);
      if (sprite) {
        // Choose frame based on unit state and animation
        let frameIndex = 0;
        
        if (unit.state === 'dead') {
          frameIndex = 3; // Frame 4 (index 3) for death
        } else if (unit.state === 'attack') {
          frameIndex = 2; // Frame 3 (index 2) for attack
        } else {
          // Idle animation - cycle between frames 0 and 1 every 400ms (slower)
          frameIndex = Math.floor((this.animationTime / 400) % 2);
        }
        
        // Assuming 4 frames of 16x16 arranged horizontally in sprite sheet
        const frameX = frameIndex * 16;
        
        this.ctx.drawImage(
          sprite,
          frameX, 0, 16, 16,  // Source: current frame
          pixelX, pixelY, 8, 8  // Dest: scale down to 8x8 to fit grid
        );
      } else {
        // Fallback to colored rectangle if sprite not loaded
        this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
        this.ctx.fillRect(pixelX, pixelY, 8, 8);
      }
      count++;
    }
    
  }
}

export { Game };

console.log('Game module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Game = Game; // Expose for browser use
}