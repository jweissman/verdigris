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
    if (unit.state === "dead") {
      return 3; // Frame 4 (index 3) for death
    } else if (unit.state === "attack") {
      return 2; // Frame 3 (index 2) for attack
    } else {
      return Math.floor((animationTime / 400) % 2);
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
