import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";
import { SpriteScale, getSpriteDimensions, getUnitScale } from "../types/SpriteScale";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  sprites: Map<string, HTMLImageElement>;
  animationTime: number;
  unitInterpolations?: Map<string, any>;
}

export interface UnitRenderOptions {
  viewType: "orthographic" | "isometric" | "cinematic";
  scale?: number;
  showShadows?: boolean;
  showHealthBars?: boolean;
  showDebugInfo?: boolean;
}

/**
 * Centralized unit rendering logic to prevent drift between views
 */
export class UnitRenderer {
  private sim: Simulator;

  constructor(sim: Simulator) {
    this.sim = sim;
  }

  /**
   * Determine if a unit should be rendered this frame
   */
  shouldRenderUnit(unit: Unit): boolean {
    if (unit.meta.phantom) {
      return false;
    }

    if (unit.state === "dead" && unit.hp <= 0) {
      return true; // Show dead units for now
    }

    return true;
  }

  /**
   * Check if unit should blink due to recent damage
   */
  shouldBlinkFromDamage(unit: Unit, animationTime: number): boolean {
    const recentDamage = this.sim.processedEvents.find(
      (event) =>
        event.kind === "damage" &&
        event.target === unit.id &&
        event.meta.tick &&
        this.sim.ticks - event.meta.tick < 2,
    );

    return recentDamage && Math.floor(animationTime / 100) % 2 === 0;
  }

  /**
   * Get the current animation frame for a unit
   */
  getAnimationFrame(unit: Unit, animationTime: number): number {
    // Special handling for hero units with extended animations
    if (unit.tags?.includes("hero") || unit.meta?.scale === "hero") {
      if (unit.state === "dead") {
        return 12; // Last frame for death
      } else if (unit.state === "attack") {
        return 6; // Single attack frame (no cycling)
      } else if (unit.state === "walk" || (unit.intendedMove && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0))) {
        return 1; // Walking frame
      } else {
        return 0; // Idle frame (no cycling for now to prevent jitter)
      }
    }
    
    // Standard 4-frame units
    if (unit.state === "dead") {
      return 3; // Frame 4 (index 3) for death
    } else if (unit.state === "attack") {
      return 2; // Frame 3 (index 2) for attack
    } else if (unit.state === "walk" || (unit.intendedMove && (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0))) {
      return 1; // Walking frame
    } else {
      return 0; // Idle frame (no cycling)
    }
  }

  /**
   * Get sprite dimensions for a unit
   */
  getSpriteDimensions(unit: Unit): { width: number; height: number } {
    // Use new scale system
    const scale = getUnitScale(unit);
    const dimensions = getSpriteDimensions(scale);
    
    // Allow override with explicit width/height in meta
    if (unit.meta?.width && unit.meta?.height) {
      return {
        width: unit.meta.width,
        height: unit.meta.height
      };
    }
    
    return dimensions;
  }

  /**
   * Calculate render position with interpolation
   */
  getRenderPosition(
    unit: Unit,
    interpolations?: Map<string, any>,
  ): { x: number; y: number; z: number } {
    let x = unit.pos.x;
    let y = unit.pos.y;
    let z = unit.meta.z || 0;

    const interp = interpolations?.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);
      x = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      y = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      z = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }

    return { x, y, z };
  }

  /**
   * Draw unit shadow
   */
  drawShadow(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
    scale: number = 8,
  ) {
    const isHuge = unit.meta.huge;

    ctx.save();
    ctx.fillStyle = "#00000050";
    ctx.beginPath();

    const shadowWidth = isHuge ? 24 : 6;
    const shadowHeight = isHuge ? 6 : 3;
    const shadowOffsetY = isHuge ? -4 : 6;
    const shadowOffsetX = isHuge ? 8 : -2;

    ctx.ellipse(
      screenX + shadowOffsetX,
      screenY + shadowOffsetY,
      shadowWidth,
      shadowHeight,
      0,
      0,
      2 * Math.PI,
    );
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw health bar above unit
   */
  drawHealthBar(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
  ) {
    if (unit.hp >= unit.maxHp) return; // Don't show if at full health

    const barWidth = 12;
    const barHeight = 2;
    const barY = screenY - 12;

    ctx.fillStyle = "#000000";
    ctx.fillRect(screenX - barWidth / 2, barY, barWidth, barHeight);

    const healthPercent = Math.max(0, unit.hp / unit.maxHp);
    const healthColor =
      healthPercent > 0.5
        ? "#00ff00"
        : healthPercent > 0.25
          ? "#ffff00"
          : "#ff0000";
    ctx.fillStyle = healthColor;
    ctx.fillRect(
      screenX - barWidth / 2,
      barY,
      barWidth * healthPercent,
      barHeight,
    );
  }

  /**
   * Main unit rendering method
   */
  renderUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    sprites: Map<string, HTMLImageElement>,
    screenX: number,
    screenY: number,
    options?: {
      scale?: number;
      showShadow?: boolean;
      flipHorizontal?: boolean;
    }
  ) {
    // Handle rigged units (modular body parts)
    if (unit.meta?.rig) {
      // screenY already includes Z offset from isometric renderer
      this.renderRiggedUnit(ctx, unit, sprites, screenX, screenY, options);
      return;
    }
    
    // Normal sprite rendering
    const sprite = sprites.get(unit.sprite || unit.type);
    if (!sprite || !sprite.complete) {
      // Fallback to colored square
      ctx.fillStyle = this.getUnitColor(unit);
      ctx.fillRect(screenX - 8, screenY - 8, 16, 16);
      return;
    }
    
    const dimensions = this.getSpriteDimensions(unit);
    const frameWidth = dimensions.width;
    const frameCount = Math.floor(sprite.width / frameWidth);
    // Use centralized frame calculation
    const frame = this.getAnimationFrame(unit, Date.now());
    
    ctx.save();
    
    if (options?.flipHorizontal) {
      ctx.scale(-1, 1);
      ctx.translate(-screenX * 2 - frameWidth, 0);
    }
    
    ctx.drawImage(
      sprite,
      frame * frameWidth, 0, frameWidth, dimensions.height,
      screenX - frameWidth / 2, screenY - dimensions.height / 2,
      frameWidth, dimensions.height
    );
    
    ctx.restore();
  }
  
  /**
   * Render unit with modular body parts
   */
  private renderRiggedUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    sprites: Map<string, HTMLImageElement>,
    centerX: number,
    centerY: number,
    options?: any
  ) {
    const parts = unit.meta.rig;
    if (!parts || !Array.isArray(parts)) return;
    
    for (const part of parts) {
      const sprite = sprites.get(part.sprite);
      if (!sprite || !sprite.complete) {
        console.warn(`Missing sprite for ${part.name}: ${part.sprite}`);
        continue;
      }
      
      // Calculate position for this part
      const pixelX = centerX + part.offset.x;
      const pixelY = centerY + part.offset.y;
      
      // Calculate frame position (3 frames at 16x16)
      const frameX = part.frame * 16;
      
      ctx.save();
      
      // Apply rotation if needed
      if (part.rotation) {
        ctx.translate(pixelX, pixelY);
        ctx.rotate(part.rotation);
        ctx.translate(-8, -8);
      } else {
        ctx.translate(pixelX - 8, pixelY - 8);
      }
      
      // Draw the sprite frame
      ctx.drawImage(
        sprite,
        frameX, 0, 16, 16, // Source: 16x16 frame
        0, 0, 16, 16 // Dest: 16x16
      );
      
      ctx.restore();
    }
  }
  
  /**
   * Get unit color for fallback rendering
   */
  getUnitColor(unit: Unit): string {
    if (unit.team === "hostile") return "#ff4444";
    if (unit.team === "friendly") return "#4444ff";
    if (unit.sprite === "worm") return "#44ff44";
    return "#888888";
  }

  /**
   * Determine if sprite should be flipped
   */
  shouldFlipSprite(unit: Unit): boolean {
    const facing = unit.meta.facing || "right";
    return facing === "left";
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
