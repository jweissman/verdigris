import { Simulator } from "./simulator";

export default class Renderer {
  private unitInterpolations: Map<string, { startX: number, startY: number, targetX: number, targetY: number, progress: number }> = new Map();
  private animationTime: number = 0;
  // Track previous positions to detect movement
  private previousPositions: Map<string, {x: number, y: number}> = new Map();

  constructor(width: number, height: number, private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D, private sim: Simulator, private sprites: Map<string, HTMLImageElement>) {
    this.canvas.width = width * 8; // 8 pixels per grid cell
    this.canvas.height = height * 8; // 8 pixels per grid cell
    this.ctx = this.canvas.getContext('2d')!;
    // this.unitInterpolations = new Map();
    // this.animationTime = 0;
  }

  draw() { //}ctx: CanvasRenderingContext2D, sim: Simulator, sprites: Map<string, HTMLImageElement>) {
    this.updateMovementInterpolations();
  //   if (!ctx || !sim || !sprites) return;

  //   ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  //   sim.units.forEach(unit => {
  //     const sprite = sprites.get(unit.sprite);
  //     if (sprite) {
  //       ctx.drawImage(sprite, unit.pos.x * 8, unit.pos.y * 8, 8, 8);
  //     }
  //   });
  // }
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
      
      // Draw HP bar above unit
      if (typeof unit.hp === 'number') {
        const maxHp = unit.maxHp || 100; // fallback if not present
        const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
        const barWidth = 8;
        const barHeight = 2;
        const barX = pixelX;
        const barY = pixelY - 3;
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        // HP amount
        this.ctx.fillStyle = hpRatio > 0.5 ? '#0f0' : hpRatio > 0.2 ? '#ff0' : '#f00';
        this.ctx.fillRect(barX, barY, Math.round(barWidth * hpRatio), barHeight);
      }
      count++;
    }
    
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
        // console.log(`🏃 ${unit.sprite} moved: (${prevPos.x},${prevPos.y}) → (${unit.pos.x},${unit.pos.y}) [Δ${deltaX},${deltaY}]`);
        
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