import { Unit } from "../sim/types";
import View from "./view";

export default class CinematicView extends View {
  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    // Draw procedural background
    this.renderBackground();
    
    // Sort units by y position for proper layering (back to front)
    const sortedUnits = [...this.sim.units].sort((a, b) => b.pos.y - a.pos.y > 0 ? 1 : -1);

    // Draw units with cinematic positioning
    for (const unit of sortedUnits) {
      this.showUnitCinematic(unit);
    }
    
    // Draw projectiles in cinematic view
    for (const projectile of this.sim.projectiles) {
      this.showProjectileCinematic(projectile);
    }

    // Add AoE effects in cinematic view
    this.renderAoEEffectsCinematic();
  }

  private renderBackground() {
    // Simple procedural background for cinematic view
    this.ctx.save();
    
    // Mountains (triangular peaks)
    this.ctx.fillStyle = '#ccc';
    const mountainY = this.height * 0.5;
    const numPeaks = 45;
    for (let i = 0; i < numPeaks; i++) {
      const peakX = ((this.width*2) / numPeaks) * i + Math.sin(i * 0.7) * 20;
      const peakHeight = 40 + Math.sin(i * 1.2) * 20;
      
      this.ctx.beginPath();
      this.ctx.moveTo(peakX - 30, mountainY);
      this.ctx.lineTo(peakX, mountainY - peakHeight);
      this.ctx.lineTo(peakX + 30, mountainY);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // fill bottom area with a solid color
    this.ctx.fillStyle = '#eee';
    this.ctx.fillRect(0, mountainY, this.width, this.height - mountainY);
    
    this.ctx.restore();
  }

  private showUnitCinematic(unit: Unit) {
    // Check if unit was recently damaged and should blink
    const recentDamage = this.sim.processedEvents.find(event => 
      event.kind === 'damage' && 
      event.target === unit.id && 
      event.tick && 
      (this.sim.ticks - event.tick) < 2
    );
    
    if (recentDamage && Math.floor(this.animationTime / 100) % 2 === 0) {
      return; // Don't render this frame (creates blink effect)
    }

    // Calculate render position with cinematic adjustments
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
    
    // Cinematic positioning: more compressed vertically, slight perspective scaling
    const battleStripY = this.height * 0.8; // Position battle at bottom
    const yRatio = 1 - (renderY / this.sim.fieldHeight); // Scale Y to fit cinematic strip
    const depthScale = 1  + (yRatio * 4); // Front units slightly larger
    const stackingFactor = 0.24; // Compress Y spacing
    
    const cinematicX = renderX * 8;
    const cinematicY = battleStripY - (renderY * 8 * stackingFactor);
    const pixelSize = Math.round(16 * depthScale);
    
    // Adjust for z height
    let finalY = cinematicY;
    if (renderZ > 0) {
      finalY -= renderZ * 4.8;
    }
    
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      // Draw ground shadow for all units in cinematic view
      this.ctx.save();
      this.ctx.fillStyle = '#00000040';
      this.ctx.beginPath();
      // Scale shadow with unit size
      this.ctx.ellipse(cinematicX, battleStripY - (renderY * 8 * stackingFactor) + pixelSize/3, 
                       pixelSize/3, pixelSize/6, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();

      // Choose frame based on unit state
      let frameIndex = 0;
      if (unit.state === 'dead') {
        frameIndex = 3;
      } else if (unit.state === 'attack') {
        frameIndex = 2;
      } else {
        frameIndex = Math.floor((this.animationTime / 400) % 2);
      }
      
      const frameX = frameIndex * 16;
      const pixelX = cinematicX - pixelSize / 2;
      const pixelY = Math.round(finalY - pixelSize / 2);
      
      this.ctx.drawImage(
        sprite,
        frameX, 0, 16, 16,
        pixelX, pixelY, pixelSize, pixelSize
      );
    } else {
      // Fallback rectangle
      this.ctx.fillStyle = unit.sprite === "worm" ? "green" : "blue";
      this.ctx.fillRect(Math.round(cinematicX - pixelSize/2), Math.round(finalY - pixelSize/2), pixelSize, pixelSize);
    }
    
    // Draw HP bar (adjusted for cinematic scale)
    if (typeof unit.hp === 'number') {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      if (hpRatio < 0.8) {
        this.drawBar("hit points", Math.round(cinematicX - pixelSize / 2), Math.round(finalY - pixelSize / 2) - 4, pixelSize, 2, hpRatio);
      }
    }

    // Draw ability progress bars
    if (unit.abilities && unit.abilities.jumps) {
      const ability = unit.abilities.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", Math.round(cinematicX - pixelSize/2), Math.round(finalY - pixelSize/2) - 6, pixelSize, 2, progressRatio, '#ace');
      }
    }
  }

  private showProjectileCinematic(projectile: any) {
    // Calculate interpolated render position for smooth cinematic movement
    let renderX = projectile.pos.x;
    let renderY = projectile.pos.y;
    let renderZ = projectile.z || 0;
    
    const interp = this.projectileInterpolations.get(projectile.id);
    if (interp) {
      const easeProgress = projectile.type === 'bomb' ? 
        this.easeInOutQuad(interp.progress) : // Smooth for bombs
        interp.progress; // Linear for bullets
      
      renderX = interp.startX + (interp.targetX - interp.startX) * easeProgress;
      renderY = interp.startY + (interp.targetY - interp.startY) * easeProgress;
      renderZ = interp.startZ + (interp.targetZ - interp.startZ) * easeProgress;
    }
    
    // Cinematic positioning
    const battleStripY = this.height * 0.8;
    const stackingFactor = 0.24;
    
    const cinematicX = renderX * 8;
    const cinematicY = battleStripY - (renderY * 8 * stackingFactor);
    let adjustedCinematicY = cinematicY;
    
    // Apply z-axis offset for elevation
    if (renderZ > 0) {
      adjustedCinematicY -= renderZ * 4.8; // Same scale as cinematic units
    }
    
    this.ctx.save();
    
    if (projectile.type === 'bomb') {
      // Scale bombs with perspective like units
      const yRatio = 1 - (renderY / this.sim.fieldHeight);
      const scale = 1 + (yRatio * 2); // Bombs get bigger in foreground
      
      // Bombs in cinematic view - larger black circles with white border, scaled
      this.ctx.fillStyle = '#000';
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, adjustedCinematicY, (projectile.radius || 2) * 2 * scale, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Add a ground shadow if elevated
      if (renderZ > 0) {
        this.ctx.fillStyle = '#00000030';
        this.ctx.beginPath();
        this.ctx.arc(cinematicX, cinematicY, (projectile.radius || 2) * 1.5 * scale, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      // Scale bullets with perspective too
      const yRatio = 1 - (renderY / this.sim.fieldHeight);
      const scale = 1 + (yRatio * 1.5); // Bullets get bigger in foreground
      
      // Bullets are simple black dots in cinematic view, scaled
      this.ctx.fillStyle = '#000';
      this.ctx.strokeStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, adjustedCinematicY, (projectile.radius || 2) * 1.2 * scale, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // NO trails in cinematic view - they look wrong
    }
    
    this.ctx.restore();
  }

  private renderAoEEffectsCinematic() {
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
      
      // Cinematic positioning
      const battleStripY = this.height * 0.8;
      const stackingFactor = 0.24;
      
      const cinematicX = pos.x * 8;
      const cinematicY = battleStripY - (pos.y * 8 * stackingFactor);
      
      // Scale effect with perspective
      const yRatio = 1 - (pos.y / this.sim.fieldHeight);
      const scale = 1 + (yRatio * 2);
      
      // Draw cinematic AoE ring
      this.ctx.save();
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.strokeStyle = event.meta.aspect === 'heal' ? '#00ff88' : '#ff4400';
      this.ctx.lineWidth = 2 * scale;
      const pixelRadius = radius * 8 * stackingFactor * scale;
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, cinematicY, pixelRadius, 0, 2 * Math.PI);
      this.ctx.stroke();
      
      // Add inner fill
      this.ctx.globalAlpha = alpha * 0.2;
      this.ctx.fillStyle = event.meta.aspect === 'heal' ? '#00ff8830' : '#ffaa0030';
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawBar(_label: string, pixelX: number, pixelY: number, width: number, height: number, ratio: number, colorOverride?: string) {
    const barWidth = width; // Match sprite width
    const barHeight = height;
    const barX = pixelX;
    const barY = pixelY - 4; // Above the sprite
    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    // HP amount
    this.ctx.fillStyle = ratio > 0.5 ? '#0f0' : ratio > 0.2 ? '#ff0' : '#f00';
    if (colorOverride) {
      this.ctx.fillStyle = colorOverride; // Use custom color if provided
    }
    this.ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }

  private easeInOutQuad(t: number): number {
    // Less smooth, more chunky movement
    // Sharp acceleration at start, then linear
    return t < 0.3 ? 4 * t * t : 0.36 + 0.64 * (t - 0.3) / 0.7;
  }
}