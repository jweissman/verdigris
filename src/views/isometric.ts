import { Projectile, Unit } from "../sim/types";
import View from "./view";

export default class Isometric extends View {
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    // Draw background from cinematic view
    this.renderBackground();
    
    // Draw grid dots from battle view
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.grid();
    this.ctx.restore();
    
    // Sort units by y position for proper layering (from cinematic view)
    const sortedUnits = [...this.sim.units].sort((a, b) => b.pos.y - a.pos.y > 0 ? 1 : -1);

    // Draw units normally (from battle view)
    for (const unit of sortedUnits) {
      this.showUnit(unit);
    }
    
    // Draw projectiles (from battle view)
    for (const projectile of this.sim.projectiles) {
      this.showProjectile(projectile);
    }

    // Draw particles (lightning, weather effects, etc.)
    this.renderParticles();

    // Render overlays (from battle view)
    this.renderOverlays();
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
      
      this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
    }
    
    this.ctx.restore();
  }
  
  // Configurable coordinate offsets - can be adjusted for different canvas sizes
  protected baseOffsetX: number = -20;  // Default for battle scenes
  protected baseOffsetY: number = 125;  // Default for battle scenes (battlestrip area)
  
  protected toIsometric(x: number, y: number): { x: number; y: number } {
    const tileWidth = 16;
    const rowOffset = 3; // Pixels to offset each row for pseudo-isometric depth
    
    // Simple orthogonal grid with row staggering for depth illusion
    const screenX = x * tileWidth + (y * rowOffset) + this.baseOffsetX;
    const screenY = (y * 3) + this.baseOffsetY;
    
    return { x: screenX, y: screenY };
  }

  private grid({ dotSize } = { dotSize: 1 }) {
    for (let x = 0; x < this.sim.fieldWidth; x++) {
      for (let y = 0; y < this.sim.fieldHeight; y++) {
        const { x: screenX, y: screenY } = this.toIsometric(x, y);
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, dotSize, 0, 2 * Math.PI);
        this.ctx.fillStyle = "#888";
        this.ctx.fill();
      }
    }
  }

  private showUnit(unit: Unit) {
    if (unit.meta.phantom) {
      return;
    }

    // Removed debug logging - coordinate issue resolved

    const recentDamage = this.sim.processedEvents.find(event => 
      event.kind === 'damage' && 
      event.target === unit.id && 
      event.tick && 
      (this.sim.ticks - event.tick) < 2
    );
    
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return;
    }

    let renderX = unit.pos.x;
    let renderY = unit.pos.y;
    let renderZ = unit.meta?.z || 0;
      
    const interp = this.unitInterpolations.get(unit.id);
    if (interp) {
      const easeProgress = this.easeInOutQuad(interp.progress);
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
      
    const isHuge = unit.meta.huge;
    let spriteWidth = 16;
    let spriteHeight = 16;
    
    if (isHuge) {
      spriteWidth = unit.meta.width || 64;
      spriteHeight = unit.meta.height || 32;
    }
    
    const { x: screenX, y: screenY } = this.toIsometric(renderX, renderY);
    
    // Add coordinate logging for small canvas debugging
    // if (isSmallCanvas) {
    //   console.log(`      📍 toIsometric(${renderX}, ${renderY}) -> screen(${screenX}, ${screenY})`);
    // }
    
    const pixelX = screenX - spriteWidth / 2;
    const pixelY = screenY - spriteHeight / 2; // Center vertically instead of bottom-align

    let realPixelY = pixelY;
      
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      let frameIndex = 0;
        
      if (unit.state === 'dead') {
        frameIndex = 3;
      } else if (unit.state === 'attack') {
        frameIndex = 2;
      } else {
        frameIndex = Math.floor((this.animationTime / 400) % 2);
      }
        
      // Check if sprite has multiple frames or is single-frame
      const expectedSpriteWidth = spriteWidth * 4; // 4 frames expected
      const actualSpriteWidth = sprite.width;
      const frameX = (actualSpriteWidth >= expectedSpriteWidth) ? frameIndex * spriteWidth : 0;

      if (renderZ > 0) {
        realPixelY -= renderZ * 8;
      }

      realPixelY = Math.round(realPixelY);
      
      this.ctx.save();
      this.ctx.fillStyle = '#00000005';
      this.ctx.beginPath();
      const shadowWidth = spriteWidth * 0.8;
      const shadowHeight = shadowWidth / 2;
      this.ctx.ellipse(screenX, screenY, shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      const facing = unit.meta.facing || 'right';
      const shouldFlip = facing === 'left';
      
      if (shouldFlip) {
        this.ctx.scale(-1, 1);
        this.ctx.translate(-screenX * 2, 0);
      }
      
      this.ctx.drawImage(
        sprite,
        frameX, 0, spriteWidth, spriteHeight,
        pixelX, realPixelY, spriteWidth, spriteHeight
      );
      
      this.ctx.restore();
    } else {

      this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
      this.ctx.fillRect(pixelX, realPixelY, 8, 8);
    }
      
    if (typeof unit.hp === 'number') {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      this.drawBar("hit points", pixelX, realPixelY - 4, spriteWidth, 2, hpRatio);
    }

    if (unit.abilities && unit.abilities.jumps) {
      const ability = unit.abilities.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", pixelX, realPixelY - 6, spriteWidth, 2, progressRatio, '#ace');
      }
    }
  }

  private drawBar(_label: string, pixelX: number, pixelY: number, width: number, height: number, ratio: number, colorOverride?: string) {
    const barWidth = width;
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4;
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.2 ? '#ff0' : '#f00';
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
      const easeProgress = projectile.type === 'bomb' ? 
        this.easeInOutQuad(interp.progress) :
        interp.progress;
      
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
    
    if (projectile.type === 'bomb') {
      if (projectile.origin && projectile.target && projectile.progress && projectile.duration) {
        this.drawBombArcTrail(projectile);
      }
      
      this.ctx.fillStyle = '#000';
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, (projectile.radius || 2) * 1.2, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      
      if (renderZ > 0) {
        this.ctx.fillStyle = '#00000040';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, (projectile.radius || 2) * 0.8, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath();
      this.ctx.arc(screenX, adjustedScreenY, projectile.radius || 0.5, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private easeInOutQuad(t: number): number {
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }

  private drawBombArcTrail(projectile: Projectile) {
    let { origin, target, progress, duration } = projectile;
    if (!origin || !target || progress === undefined || duration === undefined) {
      return;
    }
    
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseHeight = 12;
    const distanceMultiplier = Math.min(2, distance / 5);
    const height = baseHeight * distanceMultiplier;
    
    this.ctx.save();
    this.ctx.fillStyle = '#666';
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
      if (unit.state === 'dead') continue;
      
      this.renderMovementIntention(unit);
      this.renderJumpTarget(unit);
      this.renderTossTarget(unit);
    }
    
    this.renderAoEEffects();
  }

  private renderMovementIntention(unit: Unit) {
    if (!unit.intendedMove || (unit.intendedMove.x === 0 && unit.intendedMove.y === 0)) {
      return;
    }

    const { x: unitScreenX, y: unitScreenY } = this.toIsometric(unit.pos.x, unit.pos.y);
    const targetPos = { x: unit.pos.x + unit.intendedMove.x, y: unit.pos.y + unit.intendedMove.y };
    const { x: targetScreenX, y: targetScreenY } = this.toIsometric(targetPos.x, targetPos.y);
    
    this.ctx.save();
    this.ctx.strokeStyle = unit.team === 'friendly' ? '#00ff00' : '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.8;
    
    this.ctx.beginPath();
    this.ctx.moveTo(unitScreenX, unitScreenY - 16);
    this.ctx.lineTo(targetScreenX, targetScreenY - 16);
    this.ctx.stroke();
    
    const angle = Math.atan2(targetScreenY - unitScreenY, targetScreenX - unitScreenX);
    const headLength = 6;
    
    this.ctx.beginPath();
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle - Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(targetScreenX, targetScreenY - 16);
    this.ctx.lineTo(
      targetScreenX - headLength * Math.cos(angle + Math.PI / 6),
      targetScreenY - 16 - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private renderJumpTarget(unit: Unit) {
    if (!unit.meta?.jumping || !unit.meta?.jumpTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.jumpTarget.x, unit.meta.jumpTarget.y);
    
    this.ctx.save();
    this.ctx.fillStyle = '#4444ff';
    this.ctx.globalAlpha = 0.4;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderTossTarget(unit: Unit) {
    if (!unit.meta?.tossing || !unit.meta?.tossTarget) {
      return;
    }

    const { x: screenX, y: screenY } = this.toIsometric(unit.meta.tossTarget.x, unit.meta.tossTarget.y);
    
    this.ctx.save();
    this.ctx.fillStyle = '#8844ff';
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 8, 4, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ff44aa';
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.7;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private renderAoEEffects() {
    const recentAoEEvents = this.sim.processedEvents.filter(event => 
      event.kind === 'aoe' && 
      event.tick && 
      (this.sim.ticks - event.tick) < 10
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== 'object' || !('x' in event.target)) continue;
      
      const pos = event.target as {x: number, y: number};
      const radius = event.meta.radius || 3;
      const age = event.tick ? (this.sim.ticks - event.tick) : 0;
      const maxAge = 10;
      
      const alpha = Math.max(0, 1 - (age / maxAge));
      
      const centerScreen = this.toIsometric(pos.x, pos.y);
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.fillStyle = '#ffaa00';
      
      const pixelRadiusX = radius * 8;
      const pixelRadiusY = radius * 4;

      this.ctx.beginPath();
      this.ctx.ellipse(centerScreen.x, centerScreen.y, pixelRadiusX, pixelRadiusY, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      
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
    const isoPos = this.toIsometric(particle.pos.x / 8, particle.pos.y / 8);
    
    this.ctx.save();
    
    // Apply particle transparency based on lifetime
    const alpha = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    this.ctx.globalAlpha = Math.min(alpha, 1);
    
    // Lightning particles get special bright rendering
    if (particle.type === 'lightning') {
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, isoPos.y, particle.radius, 0, 2 * Math.PI);
      this.ctx.fill();
    } else {
      // Generic particle rendering
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(isoPos.x, isoPos.y, particle.radius, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
}
