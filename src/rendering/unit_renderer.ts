import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";
import {
  SpriteScale,
  getSpriteDimensions,
  getUnitScale,
} from "../types/SpriteScale";

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
    if (unit.tags?.includes("hero") || unit.meta?.scale === "hero") {
      if (unit.state === "dead") {
        return 12; // Last frame for death
      } else if (unit.state === "attack") {
        return 6; // Single attack frame (no cycling)
      } else if (
        unit.state === "walk" ||
        (unit.intendedMove &&
          (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0))
      ) {
        return 1; // Walking frame
      } else {
        return 0; // Idle frame (no cycling for now to prevent jitter)
      }
    }

    if (unit.state === "dead") {
      return 3; // Frame 4 (index 3) for death
    } else if (unit.state === "attack") {
      return 2; // Frame 3 (index 2) for attack
    } else if (
      unit.state === "walk" ||
      (unit.intendedMove &&
        (unit.intendedMove.x !== 0 || unit.intendedMove.y !== 0))
    ) {
      return 1; // Walking frame
    } else {
      return 0; // Idle frame (no cycling)
    }
  }

  /**
   * Get sprite dimensions for a unit
   */
  getSpriteDimensions(unit: Unit): { width: number; height: number } {
    const scale = getUnitScale(unit);
    const dimensions = getSpriteDimensions(scale);

    if (unit.meta?.width && unit.meta?.height) {
      return {
        width: unit.meta.width,
        height: unit.meta.height,
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
    const z = unit.meta?.z || 0;

    if (z <= 0) return;

    ctx.save();
    ctx.fillStyle = "#00000040";
    ctx.beginPath();

    const shadowWidth = isHuge ? 24 : 6;
    const shadowHeight = isHuge ? 6 : 3;

    ctx.ellipse(screenX, screenY, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
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
    },
  ) {
    if (unit.meta?.rig) {
      this.renderRiggedUnit(ctx, unit, sprites, screenX, screenY, options);
      return;
    }

    const sprite = sprites.get(unit.sprite || unit.type);
    if (!sprite || !sprite.complete) {
      ctx.fillStyle = this.getUnitColor(unit);
      ctx.fillRect(screenX - 8, screenY - 8, 16, 16);
      return;
    }

    const dimensions = this.getSpriteDimensions(unit);
    const frameWidth = dimensions.width;
    const frameCount = Math.floor(sprite.width / frameWidth);

    const frame = this.getAnimationFrame(unit, Date.now());

    ctx.save();

    if (options?.flipHorizontal) {
      ctx.scale(-1, 1);
      ctx.translate(-screenX * 2 - frameWidth, 0);
    }

    ctx.drawImage(
      sprite,
      frame * frameWidth,
      0,
      frameWidth,
      dimensions.height,
      screenX - frameWidth / 2,
      screenY - dimensions.height / 2,
      frameWidth,
      dimensions.height,
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
    options?: any,
  ) {
    const rig = unit.meta.rig;
    if (!rig) return;
    
    // Convert object to array if needed
    let parts = rig;
    if (!Array.isArray(rig)) {
      // It's an object with named parts - convert to array in drawing order
      const drawOrder = ['larm', 'lleg', 'rleg', 'torso', 'rarm', 'head', 'sword'];
      parts = drawOrder.map(name => rig[name]).filter(p => p);
    }

    const shouldFlip = options?.flipHorizontal || unit.meta?.facing === "left";

    for (const part of parts) {
      const sprite = sprites.get(part.sprite);
      if (!sprite || !sprite.complete) {
        console.warn(`Missing sprite for ${part.name}: ${part.sprite}`);
        continue;
      }

      const offsetX = shouldFlip ? -part.offset.x : part.offset.x;
      const pixelX = centerX + offsetX;
      const pixelY = centerY + part.offset.y;

      const frameX = (part.frame || 0) * 16;

      ctx.save();

      if (shouldFlip) {
        ctx.scale(-1, 1);
        ctx.translate(-centerX * 2, 0);
      }

      if (part.rotation) {
        ctx.translate(pixelX, pixelY);
        const rotation = shouldFlip ? -part.rotation : part.rotation;
        ctx.rotate(rotation);
        ctx.translate(-8, -8);
      } else {
        ctx.translate(pixelX - 8, pixelY - 8);
      }

      ctx.drawImage(
        sprite,
        frameX,
        0,
        16,
        16, // Source: 16x16 frame
        0,
        0,
        16,
        16, // Dest: exact size
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
