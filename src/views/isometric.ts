import { Abilities } from "../rules/abilities";
import { Projectile } from "../types/Projectile";
import { Unit } from "../types/Unit";
import View from "./view";
import { ParticleRenderer } from "../rendering/particle_renderer";
import { UnitRenderer } from "../rendering/unit_renderer";
import FontAtlas from "../core/font_atlas";

export default class Isometric extends View {
  private particleRenderer: ParticleRenderer;
  private unitRenderer: UnitRenderer;
  private fontAtlas: FontAtlas;

  constructor(
    ctx: CanvasRenderingContext2D,
    sim: any,
    width: number,
    height: number,
    sprites: Map<string, HTMLImageElement>,
    backgrounds: Map<string, HTMLImageElement> = new Map(),
  ) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.particleRenderer = new ParticleRenderer(sprites);
    this.unitRenderer = new UnitRenderer(sim);
    this.fontAtlas = new FontAtlas(ctx);
  }

  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();
    this.renderBackground();
    this.renderCellEffects();

    this.grid();

    this.renderHoverCell();

    this.renderAttackZones();

    const sortedUnits = [...this.sim.units].sort((a, b) =>
      b.pos.y - a.pos.y > 0 ? 1 : -1,
    );

    for (const unit of sortedUnits) {
      this.showUnit(unit);
    }

    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }

    this.renderGrapplingLines();

    this.renderParticles();

    this.renderOverlays();

    this.renderHeroUI();
  }

  private renderBackground() {
    const sceneBackground = this.sim.sceneBackground;

    if (sceneBackground) {
      this.renderSceneBackground(sceneBackground);
    }
  }

  private renderSceneBackground(backgroundType: string) {
    this.ctx.save();

    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY);

      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const offsetX = (this.ctx.canvas.width - scaledWidth) / 2;
      const offsetY = (this.ctx.canvas.height - scaledHeight) / 2;

      this.ctx.drawImage(
        backgroundImage,
        offsetX,
        offsetY,
        scaledWidth,
        scaledHeight,
      );
    } else {
      // console.warn(`No background image found for type: ${backgroundType}`);
    }

    this.ctx.restore();
  }

  protected baseOffsetX: number = -20; // Default for battle scenes
  protected baseOffsetY: number = 125; // Default for battle scenes (battlestrip area)

  private getBattleStripOffsets(): { x: number; y: number } {
    const stripWidth = (this.sim as any).stripWidth;
    if (stripWidth === "wide") {
      return { x: -40, y: 100 };
    } else if (stripWidth === "narrow") {
      return { x: 0, y: 145 };
    }

    const bg = this.sim.sceneBackground || (this.sim as any).background;

    switch (bg) {
      case "mountain":
      case "winter":
        return { x: -20, y: 140 };

      case "desert":
      case "lake":
      case "forest":
        return { x: -20, y: 110 };

      case "toyforge":
      case "monastery":
        return { x: -20, y: 130 };

      case "burning-city":
        return { x: -20, y: 120 };

      default:
        return { x: this.baseOffsetX, y: this.baseOffsetY };
    }
  }

  protected toIsometric(x: number, y: number): { x: number; y: number } {
    const tileWidth = 16;
    const rowOffset = 8; // Pixels to offset each row for pseudo-isometric depth

    const offsets = this.getBattleStripOffsets();

    const battleHeight = (this.sim as any).battleHeight;
    let verticalSpacing = 3; // Default vertical spacing between rows

    if (battleHeight === "compressed") {
      verticalSpacing = 2; // Tighter vertical spacing
    } else if (battleHeight === "half") {
      verticalSpacing = 1.5; // Very tight for maps with limited vertical space
    }

    const hexOffset = Math.floor(y) % 2 === 1 ? tileWidth / 2 : 0;

    const screenX = x * tileWidth + hexOffset + offsets.x;
    const screenY = y * verticalSpacing + offsets.y;

    return { x: screenX, y: screenY };
  }

  private grid() {
    this.ctx.save();
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.globalAlpha = 0.3;

    for (let y = 0; y < this.sim.fieldHeight; y++) {
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        const isoPos = this.toIsometric(x, y);
        this.ctx.fillRect(isoPos.x - 1, isoPos.y - 1, 2, 2);
      }
    }

    this.ctx.restore();
  }

  private renderHoverCell() {
    // Check for hover cell from renderer
    const hoverCell = (this as any).hoverCell;
    if (hoverCell) {
      const { x, y } = hoverCell;

      if (
        x >= 0 &&
        x < this.sim.fieldWidth &&
        y >= 0 &&
        y < this.sim.fieldHeight
      ) {
        const isoPos = this.toIsometric(x, y);

        this.ctx.save();
        this.ctx.strokeStyle = "#FFFFFF";
        this.ctx.globalAlpha = 0.6;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.moveTo(isoPos.x, isoPos.y - 6);
        this.ctx.lineTo(isoPos.x + 10, isoPos.y);
        this.ctx.lineTo(isoPos.x, isoPos.y + 6);
        this.ctx.lineTo(isoPos.x - 10, isoPos.y);
        this.ctx.closePath();
        this.ctx.stroke();

        this.ctx.restore();
      }
    }
  }

  private renderAttackZones() {
    for (const unit of this.sim.units) {
      if (unit.meta?.attackZones && unit.meta?.attackZonesExpiry) {
        if (this.sim.ticks < unit.meta.attackZonesExpiry) {
          this.ctx.save();
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.globalAlpha = 0.4;
          this.ctx.strokeStyle = "#FFFFFF";
          this.ctx.lineWidth = 2;

          for (const zone of unit.meta.attackZones) {
            const isoPos = this.toIsometric(zone.x, zone.y);

            this.ctx.beginPath();
            this.ctx.moveTo(isoPos.x, isoPos.y - 4);
            this.ctx.lineTo(isoPos.x + 8, isoPos.y);
            this.ctx.lineTo(isoPos.x, isoPos.y + 4);
            this.ctx.lineTo(isoPos.x - 8, isoPos.y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          }

          this.ctx.restore();
        } else {
          delete unit.meta.attackZones;
          delete unit.meta.attackZonesExpiry;
        }
      }
    }
  }

  private showUnit(unit: Unit) {
    if (unit.meta.phantom) {
      return;
    }

    const recentDamage = this.sim.processedEvents.find(
      (event) =>
        event.kind === "damage" &&
        event.target === unit.id &&
        event.meta.tick &&
        this.sim.ticks - event.meta.tick < 2,
    );

    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return;
    }

    let renderX = unit.meta?.smoothX ?? unit.pos.x;
    let renderY = unit.meta?.smoothY ?? unit.pos.y;
    let renderZ = unit.meta?.z || 0;

    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const spriteWidth = dimensions.width;
    const spriteHeight = dimensions.height;

    let screenX: number;
    let screenY: number;

    // Don't use interpolation for jumping units - they handle their own smooth movement
    const interp = unit.meta?.jumping ? null : this.unitInterpolations.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);

      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;

      const startScreen = this.toIsometric(interp.startX, interp.startY);
      const endScreen = this.toIsometric(interp.targetX, interp.targetY);

      screenX = startScreen.x + (endScreen.x - startScreen.x) * easeProgress;
      screenY = startScreen.y + (endScreen.y - startScreen.y) * easeProgress;
    } else {
      const screenPos = this.toIsometric(renderX, renderY);
      screenX = screenPos.x;
      screenY = screenPos.y;
    }

    const pixelX = screenX - spriteWidth / 2;
    const pixelY = screenY - spriteHeight / 2;

    let realPixelY = pixelY;

    if (renderZ > 0) {
      realPixelY -= renderZ * 8;
    }

    const facing = unit.meta?.facing || "right";
    const shouldFlip = facing === "left";

    this.unitRenderer.drawShadow(this.ctx, unit, screenX, screenY);

    const isHero = unit.tags?.includes("hero");
    const spriteOffset = 8; // Use consistent offset for all units
    this.unitRenderer.renderUnit(
      this.ctx,
      unit,
      this.sprites,
      screenX,
      screenY - spriteOffset - renderZ * 8, // Offset up by sprite height + Z
      {
        flipHorizontal: shouldFlip,
      },
    );

    if (typeof unit.hp === "number" && unit.hp < unit.maxHp) {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar(
        "hit points",
        pixelX,
        realPixelY - 4,
        spriteWidth,
        2,
        hpRatio,
      );
    }

    if (
      unit.abilities &&
      unit.abilities.includes("jumps") &&
      unit.meta.jumping
    ) {
      const ability = Abilities.all.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = progress / duration || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar(
          "jump progress",
          pixelX,
          realPixelY - 6,
          spriteWidth,
          2,
          progressRatio,
          "#FFFFFF",
        );
      }
    }

    // Draw unit ID label only if near hover cell
    const hoverCell = (this as any).hoverCell;
    if (this.fontAtlas.fontsReady && hoverCell) {
      // Check if unit is near hover cell (within 3 tiles)
      const dx = Math.abs(unit.pos.x - hoverCell.x);
      const dy = Math.abs(unit.pos.y - hoverCell.y);
      const distance = Math.max(dx, dy);

      if (distance <= 3) {
        const labelX = pixelX + spriteWidth / 2 - 10; // Center the label
        const labelY = realPixelY + 8; // Below the unit

        // Draw background for better visibility
        const labelText = unit.id;
        const labelWidth = labelText.length * 4 + 4;
        this.ctx.fillStyle = "#000000";
        this.ctx.globalAlpha = 0.7;
        this.ctx.fillRect(labelX - 2, labelY - 2, labelWidth, 8);

        // Draw the label
        this.fontAtlas.drawTinyText(labelText, labelX, labelY, "#FFFFFF", 1);

        // Also show sprite name if it's different from ID
        if (unit.sprite && unit.sprite !== unit.id) {
          const spriteLabel = `[${unit.sprite}]`;
          this.fontAtlas.drawTinyText(
            spriteLabel,
            labelX,
            labelY + 8,
            "#FFFFFF",
            1,
          );
        }
      }
    }
  }

  private drawBar(
    _label: string,
    pixelX: number,
    pixelY: number,
    width: number,
    height: number,
    ratio: number,
    colorOverride?: string,
  ) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = "#FFFFFF";
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride;
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }

  private showProjectile(projectile: any) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;

    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress =
        projectile.type === "bomb"
          ? this.easeInOutQuad(interp.progress)
          : interp.progress;

      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }

    const { x: screenX, y: screenY } = this.toIsometric(renderX, renderY);

    let adjustedScreenY = screenY;
    if (renderZ > 0) {
      adjustedScreenY -= renderZ * 8;
    }

    this.ctx.save();

    if (projectile.type === "bomb") {
      if (
        projectile.origin &&
        projectile.target &&
        projectile.progress &&
        projectile.duration
      ) {
        this.drawBombArcTrail(projectile);
      }

      this.ctx.fillStyle = "#000000";
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(
        screenX,
        adjustedScreenY,
        (projectile.radius || 2) * 1.2,
        0,
        2 * Math.PI,
      );
      this.ctx.fill();
      this.ctx.stroke();

      if (renderZ > 0) {
        this.ctx.fillStyle = "#000000";
        this.ctx.globalAlpha = 0.25;
        this.ctx.beginPath();
        this.ctx.arc(
          screenX,
          screenY,
          (projectile.radius || 2) * 0.8,
          0,
          2 * Math.PI,
        );
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = "#000000";
      this.ctx.beginPath();
      this.ctx.arc(
        screenX,
        adjustedScreenY,
        projectile.radius || 0.5,
        0,
        2 * Math.PI,
      );
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.3 ? 4 * t * t : 0.36 + (0.64 * (t - 0.3)) / 0.7;
  }

  private drawBombArcTrail(projectile: Projectile) {
    let { origin, target, progress, duration } = projectile;
    if (
      !origin ||
      !target ||
      progress === undefined ||
      duration === undefined
    ) {
      return;
    }

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;

    this.ctx.save();
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.globalAlpha = 0.4;
    this.ctx.globalAlpha = 0.4;

    const numPoints = Math.max(8, Math.floor(distance * 2));
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = origin.x + (target.x - origin.x) * t;
      const y = origin.y + (target.y - origin.y) * t;
      const z = height * Math.sin(Math.PI * t);

      const isoPos = this.toIsometric(x, y);
      const arcY = isoPos.y - z * 8;

      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, arcY, 1, 0, 2 * Math.PI);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderOverlays() {
    for (const unit of this.sim.units) {
      if (unit.state === "dead") continue;

      this.renderMovementIntention(unit);
      this.renderJumpTarget(unit);
      this.renderTossTarget(unit);
    }

    this.renderAoEEffects();
  }

  private renderMovementIntention(unit: Unit) {
    return;

    if (
      !unit.intendedMove ||
      (unit.intendedMove.x === 0 && unit.intendedMove.y === 0)
    ) {
      return;
    }

    const { x: unitScreenX, y: unitScreenY } = this.toIsometric(
      unit.pos.x,
      unit.pos.y,
    );
    const targetPos = {
      x: unit.pos.x + unit.intendedMove.x,
      y: unit.pos.y + unit.intendedMove.y,
    };
    const { x: targetScreenX, y: targetScreenY } = this.toIsometric(
      targetPos.x,
      targetPos.y,
    );

    this.ctx.save();
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;

    this.ctx.beginPath();
    this.ctx.moveTo(unitScreenX, unitScreenY - 16);
    this.ctx.lineTo(targetScreenX, targetScreenY - 16);
    this.ctx.stroke();

    const angle = Math.atan2(
      targetScreenY - unitScreenY,
      targetScreenX - unitScreenX,
    );
    const headLength = 6;

    this.ctx.beginPath();
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle - Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle - Math.PI / 6),
    );
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle + Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle + Math.PI / 6),
    );
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderJumpTarget(unit: Unit) {
    if (!unit.meta.jumping || !unit.meta.jumpTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(
      unit.meta.jumpTarget.x,
      unit.meta.jumpTarget.y,
    );

    this.ctx.save();
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.globalAlpha = 0.4;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderTossTarget(unit: Unit) {
    if (!unit.meta.tossing || !unit.meta.tossTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(
      unit.meta.tossTarget.x,
      unit.meta.tossTarget.y,
    );

    this.ctx.save();
    this.ctx.fillStyle = "#8844ff";
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();

    this.ctx.strokeStyle = "#ff44aa";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderAoEEffects() {
    const recentAoEEvents = this.sim.processedEvents.filter(
      (event) =>
        event.kind === "aoe" &&
        event.meta.tick &&
        this.sim.ticks - event.meta.tick < 30, // Show for longer
    );

    for (const event of recentAoEEvents) {
      // Check if we have zones array (from strike command)
      if (event.meta.zones && Array.isArray(event.meta.zones)) {
        const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
        const maxAge = 30;
        const alpha = Math.max(0, 1 - age / maxAge);
        
        // Draw each cell in the strike zone
        this.ctx.save();
        this.ctx.globalAlpha = alpha * 0.6;
        this.ctx.fillStyle = "#ff0000"; // Red for strike zones
        
        for (const zone of event.meta.zones) {
          const cellScreen = this.toIsometric(zone.x, zone.y);
          
          // Draw diamond shape for each affected cell
          this.ctx.beginPath();
          this.ctx.moveTo(cellScreen.x, cellScreen.y - 4);
          this.ctx.lineTo(cellScreen.x + 8, cellScreen.y);
          this.ctx.lineTo(cellScreen.x, cellScreen.y + 4);
          this.ctx.lineTo(cellScreen.x - 8, cellScreen.y);
          this.ctx.closePath();
          this.ctx.fill();
        }
        
        this.ctx.restore();
      } else if (typeof event.target === "object" && "x" in event.target) {
        // Fallback for old-style AOE (circular)
        const pos = event.target as { x: number; y: number };
        const radius = event.meta.radius || 3;
        const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
        const maxAge = 10;

        const alpha = Math.max(0, 1 - age / maxAge);

        const centerScreen = this.toIsometric(pos.x, pos.y);

        this.ctx.save();
        this.ctx.globalAlpha = alpha * 0.4;
        this.ctx.fillStyle = "#ffaa00"; // Gold/orange for explosions

        const pixelRadiusX = radius * 8;
        const pixelRadiusY = radius * 4;

        this.ctx.beginPath();
        this.ctx.ellipse(
          centerScreen.x,
          centerScreen.y,
          pixelRadiusX,
          pixelRadiusY,
          0,
          0,
          2 * Math.PI,
        );
        this.ctx.fill();

        this.ctx.restore();
      }
    }
  }

  private renderCellEffects() {
    const cellEffectsSprite = this.sprites.get("cell-effects");
    if (!cellEffectsSprite) return;

    const cellEffects = new Map<string, { type: string; priority: number }>();

    const priorities = {
      explosion: 10,
      fire: 9,
      lightning: 8,
      ice: 7,
      snow: 6,
      heat: 5,
      pressed: 4,
      black: 2,
      white: 1,
    };

    const setCellEffect = (x: number, y: number, type: string) => {
      const key = `${x},${y}`;
      const current = cellEffects.get(key);
      const priority = priorities[type] || 0;
      if (!current || current.priority < priority) {
        cellEffects.set(key, { type, priority });
      }
    };

    const centerX = Math.floor(this.sim.fieldWidth / 2);
    const centerY = Math.floor(this.sim.fieldHeight / 2);
    const temp = this.sim.getTemperature(centerX, centerY);

    if (temp > 30) {
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2; y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, "heat");
        }
      }
    } else if (temp < 0) {
      for (let x = 0; x < this.sim.fieldWidth; x++) {
        for (let y = this.sim.fieldHeight - 2; y < this.sim.fieldHeight; y++) {
          setCellEffect(x, y, "snow");
        }
      }
    }

    for (const unit of this.sim.units) {
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);

      if (unit.meta.onFire) {
        setCellEffect(x, y, "fire");
      } else if (unit.meta.frozen) {
        setCellEffect(x, y, "ice");
      } else if (unit.meta.electrified) {
        setCellEffect(x, y, "lightning");
      }
    }

    const recentExplosions =
      this.sim.processedEvents?.filter(
        (event) =>
          event.kind === "aoe" &&
          event.meta.tick &&
          this.sim.ticks - event.meta.tick < 5,
      ) || [];

    for (const explosion of recentExplosions) {
      const pos = (explosion as any).position || (explosion as any).center;
      if (pos) {
        const x = Math.floor(pos.x);
        const y = Math.floor(pos.y);
        setCellEffect(x, y, "explosion");
      }
    }

    this.ctx.save();

    let fx = cellEffects.entries();

    for (let entry = fx.next(); !entry.done; entry = fx.next()) {
      const [cellKey, effect] = entry.value;
      const [x, y] = cellKey.split(",").map(Number);
      const { x: screenX, y: screenY } = this.toIsometric(x, y);

      let frameX = -1;
      let animationFrames = 1;
      let frameSpeed = 200;

      switch (effect.type) {
        case "white":
          frameX = 0;
          break;
        case "black":
          frameX = 1;
          break;
        case "pressed":
          frameX = 2;
          break;
        case "fire":
        case "heat":
          animationFrames = 5;
          frameSpeed = 100;
          const fireFrame = Math.floor(
            (this.animationTime / frameSpeed) % animationFrames,
          );
          frameX = 5 + fireFrame;
          break;
        case "explosion":
          animationFrames = 9;
          frameSpeed = 80;
          const explFrame = Math.floor(
            (this.animationTime / frameSpeed) % animationFrames,
          );
          frameX = 11 + explFrame; // Start at frame 11
          break;
        case "ice":
        case "snow":
          frameX = 2;
          this.ctx.globalAlpha = 0.5;
          break;
        case "lightning":
          frameX = 4;
          break;
      }

      if (frameX < 0) continue; // Skip if no valid frame found
      const spriteSize = 16;
      this.ctx.drawImage(
        cellEffectsSprite,
        frameX * spriteSize,
        0,
        spriteSize,
        spriteSize,
        screenX - 8,
        screenY - 8,
        spriteSize,
        spriteSize,
      );
    }

    this.ctx.restore();
  }

  private renderGrapplingLines() {
    for (const unit of this.sim.units) {
      if (unit.meta.grappled && unit.meta.tetherPoint) {
        const grappler = this.sim.units.find(
          (u) => u.id === unit.meta.grappledBy,
        );
        if (!grappler) continue;

        const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
        const endPos = this.toIsometric(unit.pos.x, unit.pos.y);

        this.ctx.save();
        this.ctx.strokeStyle = "#000000"; // Black rope
        this.ctx.lineWidth = 1; // Thin 1px line

        this.ctx.beginPath();
        this.ctx.moveTo(startPos.x, startPos.y);

        const midX = (startPos.x + endPos.x) / 2;
        const midY = (startPos.y + endPos.y) / 2 + 3; // Slight sag

        this.ctx.quadraticCurveTo(midX, midY, endPos.x, endPos.y);
        this.ctx.stroke();

        this.ctx.fillStyle = "#000000";
        this.ctx.beginPath();
        this.ctx.arc(startPos.x, startPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(endPos.x, endPos.y, 1, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.restore();
      }
    }

    const grappleProjectiles = this.sim.projectiles.filter(
      (p) => (p as any).type === "grapple",
    );

    for (const grapple of grappleProjectiles) {
      const grapplerID = (grapple as any).grapplerID;
      const grappler = this.sim.units.find((u) => u.id === grapplerID);
      if (!grappler) continue;

      const startPos = this.toIsometric(grappler.pos.x, grappler.pos.y);
      const endPos = this.toIsometric(grapple.pos.x, grapple.pos.y);

      this.ctx.save();
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 0.8;

      this.ctx.beginPath();
      this.ctx.moveTo(startPos.x, startPos.y);
      this.ctx.lineTo(endPos.x, endPos.y);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private renderParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;

    this.ctx.save();

    for (const particle of this.sim.particles) {
      this.renderParticle(particle);
    }

    this.ctx.restore();
  }

  private renderParticle(particle: any) {
    let x: number, y: number;

    if (particle.pos) {
      x = particle.pos.x / 8;
      y = particle.pos.y / 8;
    } else if (particle.x !== undefined && particle.y !== undefined) {
      if (
        particle.x > this.sim.fieldWidth ||
        particle.y > this.sim.fieldHeight
      ) {
        x = particle.x / 8;
        y = particle.y / 8;
      } else {
        x = particle.x;
        y = particle.y;
      }
    } else {
      x = 0;
      y = 0;
    }

    const z = particle.z || 0;

    const isoPos = this.toIsometric(x, y);
    const screenY = isoPos.y - z * 8; // Apply height offset

    const alpha = particle.lifetime > 100 ? 1 : particle.lifetime / 100;

    this.particleRenderer.renderParticle(this.ctx, particle, {
      x: isoPos.x,
      y: screenY,
      alpha: Math.min(alpha, 0.8),
      scale: 1.0,
    });

    if (particle.type === "leaf" && z > 0 && z < 5) {
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(Math.floor(isoPos.x) - 1, Math.floor(isoPos.y), 2, 1);
    }
  }

  private renderHeroUI() {
    // Find the hero unit
    const hero = this.sim.units.find((u: Unit) => u.tags?.includes("hero"));
    if (!hero) return;

    // Only render if fonts are ready
    if (!this.fontAtlas.fontsReady) return;

    // Draw health bar at top left
    const barWidth = 60;
    const barHeight = 8;
    const barX = 10;
    const barY = 10;

    // Background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    // Health bar
    const healthPercent = hero.hp / (hero.maxHp || 100);
    this.ctx.fillStyle =
      healthPercent > 0.5
        ? "#00FF00"
        : healthPercent > 0.25
          ? "#FFFF00"
          : "#FF0000";
    this.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // HP text
    this.fontAtlas.drawTinyText(
      `${hero.hp}/${hero.maxHp || 100}`,
      barX + barWidth + 5,
      barY + 2,
      "#FFFFFF",
      1,
    );

    // Draw current weapon at top right
    const weapon = hero.meta?.weapon || "sword";
    const weaponText = weapon.charAt(0).toUpperCase() + weapon.slice(1);
    this.fontAtlas.drawTinyText(
      `Weapon: ${weaponText}`,
      this.width - 80,
      barY + 2,
      "#FFFFFF",
      1,
    );

    // Draw current primary action
    const primaryAction = hero.meta?.primaryAction || "strike";
    const actionText =
      primaryAction.charAt(0).toUpperCase() + primaryAction.slice(1);
    this.fontAtlas.drawTinyText(
      `Action: ${actionText}`,
      this.width - 80,
      barY + 10,
      "#00FFFF",
      1,
    );

    // Draw abilities list at bottom left - higher up to be more visible
    const abilities = hero.abilities || [];
    let abilityY = this.height - 60; // Move higher up

    this.fontAtlas.drawTinyText("Abilities:", 10, abilityY, "#FFFF00", 1);
    abilityY += 6;

    if (abilities.length === 0) {
      this.fontAtlas.drawTinyText("- None", 15, abilityY, "#888888", 1);
    } else {
      for (let i = 0; i < abilities.length && i < 5; i++) {
        // Limit to 5 for space
        const ability = abilities[i];
        const abilityName = ability.replace(/([A-Z])/g, " $1").trim();
        this.fontAtlas.drawTinyText(
          `- ${abilityName}`,
          15,
          abilityY,
          "#FFFFFF",
          1,
        );
        abilityY += 6;
      }
    }

    // Draw controls hint at bottom right
    const hints = [
      "WASD: Move",
      "Space: Jump",
      "Q: Action",
      ",/.: Switch",
      "1-6: Weapons",
    ];

    let hintY = this.height - 30;
    for (const hint of hints) {
      this.fontAtlas.drawTinyText(hint, this.width - 70, hintY, "#888888", 1);
      hintY += 6;
    }
  }
}
