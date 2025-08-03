import { Unit } from "./sim/types";
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
  private unitInterpolations: Map<string, { startX: number, startY: number, startZ: number, targetX: number, targetY: number, targetZ: number, progress: number, duration: number }> = new Map();
  private animationTime: number = 0;
  private previousPositions: Map<string, {x: number, y: number, z: number}> = new Map();

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
      this.renderUnit(unit);
    }
    
    // Draw overlays on top of everything else
    this.renderOverlays();
  }

  private renderUnit(unit: Unit) {
    // Check if unit was recently damaged and should blink
    const recentDamage = this.sim.processedEvents.find(event => 
      event.kind === 'damage' && 
      event.target === unit.id && 
      event.tick && 
      (this.sim.ticks - event.tick) < 2 // Blink for 8 ticks
    );
    
    // Skip rendering on alternating ticks if recently damaged
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return; // Don't render this frame (creates blink effect)
    }

    // Calculate render position (interpolated if moving)
    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    let renderZ = unit.meta?.z || 0;
      
    const interp = this.unitInterpolations.get(unit.id);
    if (interp) {
      // Use smooth interpolation with easing
      const easeProgress = this.easeInOutQuad(interp.progress);
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
      
    // CRITICAL: Round to integer pixels to prevent blurring
    // Position sprites so they're centered on 8x8 grid cells but drawn at 16x16
    const gridCenterX = Math.round(renderX * 8) + 4; // Center of grid cell
    const gridCenterY = Math.round(renderY * 8) + 4; // Center of grid cell
    const pixelX = gridCenterX - 8; // Offset to center 16x16 sprite
    const pixelY = gridCenterY - 8; // Offset to center 16x16 sprite

    let realPixelY = pixelY; // Default to pixelY unless adjusted for z height
      
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

      // Offset for z height (using interpolated z value)
      if (renderZ > 0) {
        // Apply z offset for jumping or elevation
        realPixelY -= renderZ * 2.4; // Adjust Y position based on z height
      }

      realPixelY = Math.round(realPixelY); // Ensure pixelY is an integer
        
      // Draw at native 16x16 size for maximum sharpness
      this.ctx.drawImage(
        sprite,
        frameX, 0, 16, 16,  // Source: current frame at native size
        pixelX, realPixelY, 16, 16  // Dest: native 16x16 size, centered on grid
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
      this.drawBar("hit points", pixelX, realPixelY - 4, 16, 2, hpRatio);
    }

    // Draw ability progress bar if applicable
    if (unit.abilities && unit.abilities.jumps) {
      const ability = unit.abilities.jumps;
      // jump progress 
      const duration = ability.config?.jumpDuration || 10; // Default duration if not specified
      const progress = unit.meta.jumpProgress || 0;
      // const jumpDuration = ability.config?.speed || 10; // Default duration if not specified
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, 16, 2, progressRatio, '#ace');
      }
    }
  }

  private drawBar(_label: string, pixelX: number, pixelY: number, width: number, height: number, ratio: number, colorOverride?: string) {

        const barWidth = width; // Match sprite width
        const barHeight = height;
        const barX = pixelX;
        const barY = pixelY - 4; // Above the 16x16 sprite
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        // HP amount
        this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.2 ? '#ff0' : '#f00';
        if (colorOverride) {
          this.ctx.fillStyle = colorOverride; // Use custom color if provided
        }
        this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
      // }
    // }
  }

  private updateMovementInterpolations() {
    const deltaTime = 16; // ~16ms per frame at 60fps
    
    // Update animation time
    this.animationTime += deltaTime;
    
    // Check for new movements
    for (const unit of this.sim.units) {
      const prevPos = this.previousPositions.get(unit.id);
      const currentZ = unit.meta?.z || 0;
      if (!prevPos) {
        // First time seeing this unit, just record position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y, z: currentZ });
        continue;
      }
      
      // Check if unit moved or z changed
      if (prevPos.x !== unit.pos.x || prevPos.y !== unit.pos.y || prevPos.z !== currentZ) {
        // Unit moved or jumped! Start interpolation
        this.unitInterpolations.set(unit.id, {
          startX: prevPos.x,
          startY: prevPos.y,
          startZ: prevPos.z,
          targetX: unit.pos.x,
          targetY: unit.pos.y,
          targetZ: currentZ,
          progress: 0,
          duration: 400 // 400ms movement (slower)
        });
        
        // Update previous position
        this.previousPositions.set(unit.id, { x: unit.pos.x, y: unit.pos.y, z: currentZ });
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

  private renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === 'dead') continue;
      
      // Movement intention arrows
      this.renderMovementIntention(unit);
      
      // Jump target highlights
      this.renderJumpTarget(unit);
      
      // Combat target highlights
      this.renderCombatTarget(unit);
    }
    
    // AoE effect visualizations
    this.renderAoEEffects();
  }

  private renderMovementIntention(unit: Unit) {
    // Only show if unit has movement intention
    if (!unit.intendedMove || (unit.intendedMove.x === 0 && unit.intendedMove.y === 0)) {
      return;
    }

    // Calculate current unit pixel position (center of sprite)
    const unitCenterX = Math.round(unit.pos.x * 8) + 4;
    const unitCenterY = Math.round(unit.pos.y * 8) + 4;
    
    // Calculate intended target position
    const targetX = unitCenterX + unit.intendedMove.x * 8;
    const targetY = unitCenterY + unit.intendedMove.y * 8;
    
    // Draw arrow
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === 'friendly' ? '#00ff00' : '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    
    // Arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(unitCenterX, unitCenterY);
    this.ctx.lineTo(targetX, targetY);
    this.ctx.stroke();
    
    // Arrow head
    const angle = Math.atan2(targetY - unitCenterY, targetX - unitCenterX);
    const headLength = 4;
    
    this.ctx.beginPath();
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(
      targetX - headLength * Math.cos(angle - Math.PI / 6),
      targetY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(targetX, targetY);
    this.ctx.lineTo(
      targetX - headLength * Math.cos(angle + Math.PI / 6),
      targetY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderJumpTarget(unit: Unit) {
    // Only show if unit is jumping and has a target
    if (!unit.meta?.jumping || !unit.meta?.jumpTarget) {
      return;
    }

    const targetX = Math.round(unit.meta.jumpTarget.x * 8);
    const targetY = Math.round(unit.meta.jumpTarget.y * 8);
    
    // Highlight target cell with blue overlay
    this.ctx.save();
    this.ctx.fillStyle = '#4444ff';
    this.ctx.globalAlpha = 0.4;
    this.ctx.fillRect(targetX, targetY, 8, 8);
    this.ctx.restore();
  }

  private renderCombatTarget(unit: Unit) {
    // Only show if unit has a combat target
    if (!unit.intendedTarget || typeof unit.intendedTarget !== 'string') {
      return;
    }

    const target = this.sim.creatureById(unit.intendedTarget);
    if (!target) return;

    const targetX = Math.round(target.pos.x * 8);
    const targetY = Math.round(target.pos.y * 8);
    
    // Highlight target cell with red overlay
    this.ctx.save();
    this.ctx.fillStyle = '#ff4444';
    this.ctx.globalAlpha = 0.4;
    this.ctx.fillRect(targetX, targetY, 8, 8);
    this.ctx.restore();
  }

  private renderAoEEffects() {
    // Query simulator for recent AoE events
    const recentAoEEvents = this.sim.processedEvents.filter(event => 
      event.kind === 'aoe' && 
      event.tick && 
      (this.sim.ticks - event.tick) < 10 // Show for 10 ticks
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== 'object' || !('x' in event.target)) continue;
      
      const pos = event.target as {x: number, y: number};
      const radius = event.meta.radius || 3;
      const age = event.tick ? (this.sim.ticks - event.tick) : 0;
      const maxAge = 10;
      
      // Fade out over time
      const alpha = Math.max(0, 1 - (age / maxAge));
      
      // Calculate affected grid cells
      const affectedCells: {x: number, y: number}[] = [];
      const centerGridX = Math.round(pos.x);
      const centerGridY = Math.round(pos.y);
      
      // Check each cell in a square around the center
      const checkRadius = Math.ceil(radius);
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
          const cellX = centerGridX + dx;
          const cellY = centerGridY + dy;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= radius) {
            affectedCells.push({x: cellX, y: cellY});
          }
        }
      }
      
      // Highlight each affected cell
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = '#ffaa00'; // Orange for explosion
      
      for (const cell of affectedCells) {
        const pixelX = cell.x * 8;
        const pixelY = cell.y * 8;
        this.ctx.fillRect(pixelX, pixelY, 8, 8);
      }
      this.ctx.restore();
      
      // Draw impact ring around the center for visual emphasis
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle = '#ff4400';
      this.ctx.lineWidth = 1;
      const centerPixelX = Math.round(pos.x * 8) + 4;
      const centerPixelY = Math.round(pos.y * 8) + 4;
      const pixelRadius = radius * 8;
      this.ctx.beginPath();
      this.ctx.arc(centerPixelX, centerPixelY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.restore();
    }
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