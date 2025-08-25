import { Abilities } from "../rules/abilities";
import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";
import View from "./view";
import { UnitRenderer } from "../rendering/unit_renderer";
import { ParticleRenderer } from "../rendering/particle_renderer";

export default class CinematicView extends View {
  private unitRenderer: UnitRenderer;
  private particleRenderer: ParticleRenderer;

  constructor(
    ctx: CanvasRenderingContext2D,
    sim: any,
    width: number,
    height: number,
    sprites: Map<string, HTMLImageElement>,
    backgrounds: Map<string, HTMLImageElement> = new Map(),
  ) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.unitRenderer = new UnitRenderer(sim);
    this.particleRenderer = new ParticleRenderer(sprites);
  }

  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    this.renderBackground();

    this.renderLandedParticles();

    const sortedUnits = [...this.sim.units].sort((a, b) =>
      b.pos.y - a.pos.y > 0 ? 1 : -1,
    );

    for (const unit of sortedUnits) {
      this.showUnitCinematic(unit);
    }

    for (const projectile of this.sim.projectiles) {
      this.showProjectileCinematic(projectile);
    }

    this.renderFlyingParticles();

    this.renderAoEEffectsCinematic();
  }

  private renderBackground() {
    const sceneBackground = this.sim.sceneBackground;

    this.renderSceneBackground(sceneBackground);
  }

  private renderSceneBackground(backgroundType: string) {
    this.ctx.save();

    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY); // Cover the entire canvas

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
    }

    this.ctx.restore();
  }

  private showUnitCinematic(unit: Unit) {
    if (!this.unitRenderer.shouldRenderUnit(unit)) {
      return;
    }

    if (this.unitRenderer.shouldBlinkFromDamage(unit, this.animationTime)) {
      return;
    }

    const renderPos = this.unitRenderer.getRenderPosition(
      unit,
      this.unitInterpolations,
    );
    const renderX = renderPos.x;
    const renderY = renderPos.y;
    const renderZ = renderPos.z;

    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const baseWidth = dimensions.width;
    const baseHeight = dimensions.height;
    const isHuge = unit.meta.huge;

    const battleStripY = this.height * 0.8; // Position battle at bottom
    const yRatio = 1 - renderY / this.sim.fieldHeight; // Scale Y to fit cinematic strip
    const depthScale = 1 + yRatio * 1.4; // Front units slightly larger

    const cellWidth = 8;
    const cellHeight = 6; // Reduced from 8 to make more square

    const rowOffset = Math.floor(renderY) % 2 === 1 ? cellWidth / 2 : 0;

    const cinematicX = renderX * cellWidth + rowOffset;
    const cinematicY = battleStripY - renderY * cellHeight;
    const pixelWidth = Math.round(baseWidth * depthScale);
    const pixelHeight = Math.round(baseHeight * depthScale);

    let finalY = cinematicY;
    if (renderZ > 0) {
      finalY -= renderZ * 4.8;
    }

    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      this.ctx.save();
      this.ctx.fillStyle = "#00000040";
      this.ctx.beginPath();
      const shadowWidth = isHuge ? pixelWidth / 2.5 : pixelWidth / 3;
      const shadowHeight = isHuge ? pixelHeight / 8 : pixelHeight / 6;

      this.ctx.ellipse(
        cinematicX,
        cinematicY + pixelHeight / 3,
        shadowWidth,
        shadowHeight,
        0,
        0,
        2 * Math.PI,
      );
      this.ctx.fill();
      this.ctx.restore();

      const pixelX = cinematicX;
      const pixelY = Math.round(finalY);

      this.ctx.save();

      const scaleX = pixelWidth / baseWidth;
      const scaleY = pixelHeight / baseHeight;
      this.ctx.translate(pixelX, pixelY);
      this.ctx.scale(scaleX, scaleY);
      this.ctx.translate(-pixelX, -pixelY);

      this.unitRenderer.renderUnit(
        this.ctx,
        unit,
        this.sprites,
        pixelX,
        pixelY,
        {
          flipHorizontal: !this.unitRenderer.shouldFlipSprite(unit),
        },
      );
      this.ctx.restore();
    } else {
      this.ctx.fillStyle = this.unitRenderer.getUnitColor(unit);
      this.ctx.fillRect(
        Math.round(cinematicX - pixelWidth / 2),
        Math.round(finalY - pixelHeight / 2),
        pixelWidth,
        pixelHeight,
      );
    }

    if (typeof unit.hp === "number") {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      if (hpRatio < 0.8) {
        this.drawBar(
          "hit points",
          Math.round(cinematicX - pixelWidth / 2),
          Math.round(finalY - pixelHeight / 2) - 4,
          pixelWidth,
          2,
          hpRatio,
        );
      }
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
          Math.round(cinematicX - pixelWidth / 2),
          Math.round(finalY - pixelHeight / 2) - 6,
          pixelWidth,
          2,
          progressRatio,
          "#ace",
        );
      }
    }
  }

  private showProjectileCinematic(projectile: any) {
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;

    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress =
        projectile.type === "bomb"
          ? this.easeInOutQuad(interp.progress) // Smooth for bombs
          : interp.progress; // Linear for bullets

      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }

    const battleStripY = this.height * 0.8;
    const cellWidth = 8;
    const cellHeight = 6;

    const rowOffset = Math.floor(renderY) % 2 === 1 ? cellWidth / 2 : 0;

    const cinematicX = renderX * cellWidth + rowOffset;
    const cinematicY = battleStripY - renderY * cellHeight;
    let adjustedCinematicY = cinematicY;

    if (renderZ > 0) {
      adjustedCinematicY -= renderZ * 4.8; // Same scale as cinematic units
    }

    this.ctx.save();

    if (projectile.type === "bomb") {
      const yRatio = 1 - renderY / this.sim.fieldHeight;
      const scale = 1 + yRatio * 2; // Bombs get bigger in foreground

      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(
        cinematicX,
        adjustedCinematicY,
        (projectile.radius || 2) * 2 * scale,
        0,
        2 * Math.PI,
      );
      this.ctx.fill();
      this.ctx.stroke();

      if (renderZ > 0) {
        this.ctx.fillStyle = "#00000030";
        this.ctx.beginPath();
        this.ctx.arc(
          cinematicX,
          cinematicY,
          (projectile.radius || 2) * 1.5 * scale,
          0,
          2 * Math.PI,
        );
        this.ctx.fill();
      }
    } else {
      const yRatio = 1 - renderY / this.sim.fieldHeight;
      const scale = 1 + yRatio * 1.5; // Bullets get bigger in foreground

      this.ctx.fillStyle = "#000";
      this.ctx.strokeStyle = "#fff";
      this.ctx.beginPath();
      this.ctx.arc(
        cinematicX,
        adjustedCinematicY,
        (projectile.radius || 2) * 1.2 * scale,
        0,
        2 * Math.PI,
      );
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderLandedParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;

    this.ctx.save();

    const landedParticles = this.sim.particles.filter(
      (p) => (p.z || 0) <= 0 || p.landed,
    );

    for (const particle of landedParticles) {
      this.renderParticleCinematic(particle);
    }

    this.ctx.restore();
  }

  private renderFlyingParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;

    this.ctx.save();

    const flyingParticles = this.sim.particles
      .filter((p) => (p.z || 0) > 0 && !p.landed)
      .sort((a, b) => (b.z || 0) - (a.z || 0)); // Sort by depth for proper layering

    for (const particle of flyingParticles) {
      this.renderParticleCinematic(particle);
    }

    this.ctx.restore();
  }

  private renderParticleCinematic(particle: any) {
    const gridX = particle.pos.x / 8; // Convert pixel to grid
    const gridY = particle.pos.y / 8;

    const battleStripY = this.height * 0.8;
    const cellWidth = 8;
    const cellHeight = 6;

    const rowOffset = Math.floor(gridY) % 2 === 1 ? cellWidth / 2 : 0;

    const cinematicX = gridX * cellWidth + rowOffset;
    const cinematicY = battleStripY - gridY * cellHeight;

    const height = particle.z || 0;
    let adjustedY = cinematicY - height * 0.8; // Higher particles appear higher on screen

    const ageEffect = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    const alpha = Math.min(ageEffect, 1);

    const yRatio = 1 - gridY / this.sim.fieldHeight;
    const depthScale = 0.8 + yRatio * 0.6; // Particles scale from 0.8 to 1.4

    this.particleRenderer.renderParticle(this.ctx, particle, {
      x: cinematicX,
      y: adjustedY,
      alpha: alpha,
      scale: depthScale,
    });
  }

  private renderAoEEffectsCinematic() {
    const recentAoEEvents = this.sim.processedEvents.filter(
      (event) =>
        event.kind === "aoe" &&
        event.meta.tick &&
        this.sim.ticks - event.meta.tick < 10, // Show for 10 ticks
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== "object" || !("x" in event.target)) continue;

      const pos = event.target as { x: number; y: number };
      const radius = event.meta.radius || 3;
      const age = event.meta.tick ? this.sim.ticks - event.meta.tick : 0;
      const maxAge = 10;

      const alpha = Math.max(0, 1 - age / maxAge);

      const battleStripY = this.height * 0.8;
      const cellWidth = 8;
      const cellHeight = 6;

      const rowOffset = Math.floor(pos.y) % 2 === 1 ? cellWidth / 2 : 0;

      const cinematicX = pos.x * cellWidth + rowOffset;
      const cinematicY = battleStripY - pos.y * cellHeight;

      const yRatio = 1 - pos.y / this.sim.fieldHeight;
      const scale = 1 + yRatio * 2;

      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle =
        event.meta.aspect === "heal" ? "#00ff88" : "#ff4400";
      this.ctx.lineWidth = 2 * scale;
      const pixelRadius = radius * cellHeight * scale; // Use cellHeight for consistent scaling
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, cinematicY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();

      this.ctx.globalAlpha = alpha * 0.2;
      this.ctx.fillStyle =
        event.meta.aspect === "heal" ? "#00ff8830" : "#ffaa0030";
      this.ctx.fill();
      this.ctx.restore();
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
    const barWidth = width; // Match sprite width
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4; // Above the sprite

    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);

    this.ctx.fillStyle = ratio > 0.5 ? "#0f0" : ratio > 0.2 ? "#ff0" : "#f00";
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride; // Use custom color if provided
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }

  private easeInOutQuad(t: number): number {
    return t < 0.3 ? 4 * t * t : 0.36 + (0.64 * (t - 0.3)) / 0.7;
  }
}
