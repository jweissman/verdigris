import { Simulator } from "./simulator";

// Abstraction for canvas operations that works in both browser and Node
interface CanvasLike {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
}

// Factory function to create canvas - can be stubbed for tests
function createCanvas(width: number, height: number): CanvasLike {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  // For Node.js environments, return a stub
  return {
    width,
    height,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      arc: () => {},
      fillStyle: '',
      fill: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      globalAlpha: 1,
      imageSmoothingEnabled: false,
    } as any)
  };
}

// Pure rendering surface - no scaling concerns
class Display {
  protected readonly width: number;
  protected readonly height: number;
  protected readonly ctx: CanvasRenderingContext2D;
  private rotationAngle: number = 0;
  
  constructor(width: number, height: number, canvas: CanvasLike) {
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext('2d')!;
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
    
    // console.log(`Display initialized: ${width}x${height}`);
  }

  draw() {
    this.clear();
    this.render();
  }

  protected render() {
    console.warn('[RED TRIANGLE] Display#render() not implemented in', this.constructor.name);

    // Blue background
    this.ctx.fillStyle = '#0000ff';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Rotating red triangle in center
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.rotationAngle);
    
    this.ctx.fillStyle = 'red';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(-20, 20);
    this.ctx.lineTo(20, 20);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
    
    // Increment rotation for next frame
    this.rotationAngle += 0.02;
  }

  protected clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}

// Handles scaling and browser-specific concerns - uses composition, not inheritance
class ScaledDisplay {
  private virtualCanvas: CanvasLike;
  private display: Display;
  private scale: number = 1;
  
  constructor(
    private targetWidth: number, 
    private targetHeight: number, 
    private physicalCanvas: HTMLCanvasElement
  ) {
    this.virtualCanvas = createCanvas(targetWidth, targetHeight);
    this.display = new Display(targetWidth, targetHeight, this.virtualCanvas);
    
    const physicalCtx = this.physicalCanvas.getContext('2d')!;
    physicalCtx.imageSmoothingEnabled = false;
  }

  handleResize() {
    if (typeof window === 'undefined') return;
    
    const scaleX = Math.floor(window.innerWidth / this.targetWidth);
    const scaleY = Math.floor(window.innerHeight / this.targetHeight);
    this.scale = Math.max(1, Math.min(scaleX, scaleY));
    
    this.physicalCanvas.width = this.targetWidth * this.scale;
    this.physicalCanvas.height = this.targetHeight * this.scale;
    
    const ctx = this.physicalCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    
    // console.log(`Scaled to ${this.scale}x (${this.physicalCanvas.width}x${this.physicalCanvas.height})`);
  }

  draw() {
    this.display.draw();
    this.blit();
  }

  private blit() {
    const ctx = this.physicalCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.physicalCanvas.width, this.physicalCanvas.height);
    ctx.drawImage(
      this.virtualCanvas as HTMLCanvasElement,
      0, 0, this.targetWidth, this.targetHeight,
      0, 0, this.physicalCanvas.width, this.physicalCanvas.height
    );
  }
}

// Game-specific renderer - clean separation of concerns
export default class Renderer extends Display {
  private unitInterpolations: Map<string, { startX: number, startY: number, targetX: number, targetY: number, progress: number, duration: number }> = new Map();
  private animationTime: number = 0;
  private previousPositions: Map<string, {x: number, y: number}> = new Map();

  constructor(width: number, height: number, canvas: CanvasLike, private sim: Simulator, private sprites: Map<string, HTMLImageElement>) {
    super(width, height, canvas);
  }
  
  grid() {
    // Draw grid dots at exact integer positions
    for (let x = 0; x < this.width; x += 8) {
      for (let y = 0; y < this.height; y += 8) {
        this.ctx.beginPath();
        // Ensure grid dots are centered at integer coordinates
        this.ctx.arc(x + 4, y + 4, 1.5, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#888";
        this.ctx.fill();
      }
    }
  }

  render() {
    this.updateMovementInterpolations();
    // Draw grid dots
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.grid();
    this.ctx.restore();
    
    // Draw units
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
      
      // CRITICAL: Round to integer pixels to prevent blurring
      // Position sprites so they're centered on 8x8 grid cells but drawn at 16x16
      const gridCenterX = Math.round(renderX * 8) + 4; // Center of grid cell
      const gridCenterY = Math.round(renderY * 8) + 4; // Center of grid cell
      const pixelX = gridCenterX - 8; // Offset to center 16x16 sprite
      const pixelY = gridCenterY - 8; // Offset to center 16x16 sprite
      
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
        
        // Draw at native 16x16 size for maximum sharpness
        this.ctx.drawImage(
          sprite,
          frameX, 0, 16, 16,  // Source: current frame at native size
          pixelX, pixelY, 16, 16  // Dest: native 16x16 size, centered on grid
        );
      } else {
        // Fallback to colored rectangle - keep at 8x8 for grid alignment
        const fallbackX = Math.round(renderX * 8);
        const fallbackY = Math.round(renderY * 8);
        this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
        this.ctx.fillRect(fallbackX, fallbackY, 8, 8);
      }
      
      // Draw HP bar above unit - position relative to sprite center
      if (typeof unit.hp === 'number') {
        const maxHp = unit.maxHp || 100; // fallback if not present
        const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
        const barWidth = 16; // Match sprite width
        const barHeight = 2;
        const barX = pixelX;
        const barY = pixelY - 4; // Above the 16x16 sprite
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        // HP amount
        this.ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.2 ? '#ff0' : '#f00';
        this.ctx.fillRect(barX, barY, Math.round(barWidth * hpRatio), barHeight);
      }
    }
  }

  private updateMovementInterpolations() {
    const deltaTime = 16; // ~16ms per frame at 60fps
    
    // Update animation time
    this.animationTime += deltaTime;
    
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
}

// Factory function to create a properly scaled renderer for the browser
export function createScaledRenderer(targetWidth: number, targetHeight: number, physicalCanvas: HTMLCanvasElement, sim: Simulator, sprites: Map<string, HTMLImageElement>) {
  const virtualCanvas = createCanvas(targetWidth, targetHeight);
  const renderer = new Renderer(targetWidth, targetHeight, virtualCanvas, sim, sprites);
  
  let scale = 1;
  
  const handleResize = () => {
    if (typeof window === 'undefined') return;
    
    // Account for device pixel ratio but still use integer scaling
    const dpr = window.devicePixelRatio || 1;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight;
    
    const scaleX = Math.floor(availableWidth / targetWidth);
    const scaleY = Math.floor(availableHeight / targetHeight);
    scale = Math.max(1, Math.min(scaleX, scaleY));
    
    // Ensure exact integer scaling
    const exactWidth = targetWidth * scale;
    const exactHeight = targetHeight * scale;
    
    physicalCanvas.width = exactWidth;
    physicalCanvas.height = exactHeight;
    
    // CRITICAL: Set CSS size to match canvas internal size to prevent browser scaling
    physicalCanvas.style.width = `${exactWidth}px`;
    physicalCanvas.style.height = `${exactHeight}px`;
    
    // Ensure pixel-perfect rendering
    physicalCanvas.style.imageRendering = 'pixelated';
    physicalCanvas.style.imageRendering = 'crisp-edges';
    
    const ctx = physicalCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    
    // console.log(`Scaled to ${scale}x: virtual(${targetWidth}x${targetHeight}) → physical(${exactWidth}x${exactHeight}), DPR: ${dpr}`);
  };
  
  const draw = () => {
    renderer.draw();
    
    // Blit to physical canvas with exact pixel alignment
    const ctx = physicalCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, physicalCanvas.width, physicalCanvas.height);
    
    // Ensure we're drawing at exact pixel boundaries - no fractional coordinates
    const exactScale = Math.floor(scale); // Use integer scale only
    ctx.drawImage(
      virtualCanvas as HTMLCanvasElement,
      0, 0, targetWidth, targetHeight,           // Source: exact virtual canvas size
      0, 0, targetWidth * exactScale, targetHeight * exactScale  // Dest: exact scaled size
    );
  };
  
  return { renderer, handleResize, draw };
}

// console.log('Renderer module loaded.');
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.Display = Display;
  // @ts-ignore
  window.ScaledDisplay = ScaledDisplay;
  // @ts-ignore
  window.Renderer = Renderer;
  // @ts-ignore
  window.createScaledRenderer = createScaledRenderer;
}