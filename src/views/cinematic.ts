import { Abilities } from "../rules/abilities";
import { Unit } from "../types/Unit";
import { Simulator } from "../core/simulator";
import View from "./view";
import { UnitRenderer } from "../rendering/unit_renderer";

export default class CinematicView extends View {
  private unitRenderer: UnitRenderer;
  
  constructor(
    ctx: CanvasRenderingContext2D,
    sim: any,
    width: number,
    height: number,
    sprites: Map<string, HTMLImageElement>,
    backgrounds: Map<string, HTMLImageElement> = new Map()
  ) {
    super(ctx, sim, width, height, sprites, backgrounds);
    this.unitRenderer = new UnitRenderer(sim);
  }

  show() {
    this.updateMovementInterpolations();
    this.updateProjectileInterpolations();

    // Draw procedural background
    this.renderBackground();
    
    // Draw landed particles (z=0) on the ground BEFORE units
    this.renderLandedParticles();
    
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
    
    // Draw flying particles (z>0) in the air AFTER units
    this.renderFlyingParticles();

    // Add AoE effects in cinematic view
    this.renderAoEEffectsCinematic();
  }

  private renderBackground() {
    // Check if scene has a specific background set
    const sceneBackground = this.sim.sceneBackground;
    
    if (sceneBackground) {
      this.renderSceneBackground(sceneBackground);
    } else {
      // this.renderProceduralBackground();
    }
  }
  
  private renderSceneBackground(backgroundType: string) {
    this.ctx.save();
    
    // Try to load custom background image first
    const backgroundImage = this.backgrounds.get(backgroundType);
    if (backgroundImage) {
      // Scale and center the background image
      const scaleX = this.ctx.canvas.width / backgroundImage.width;
      const scaleY = this.ctx.canvas.height / backgroundImage.height;
      const scale = Math.max(scaleX, scaleY); // Cover the entire canvas
      
      const scaledWidth = backgroundImage.width * scale;
      const scaledHeight = backgroundImage.height * scale;
      const offsetX = (this.ctx.canvas.width - scaledWidth) / 2;
      const offsetY = (this.ctx.canvas.height - scaledHeight) / 2;
      
      this.ctx.drawImage(backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
    // } else {
    //   // Fallback to procedural backgrounds
    //   switch (backgroundType) {
    //     case 'lake':
    //       this.renderLakeBackground();
    //       break;
    //     case 'mountain':
    //       this.renderMountainBackground();
    //       break;
        // case 'monastery':
        //   // Add monastery procedural fallback if needed
        //   this.renderProceduralBackground();
        //   break;
      //   default:
      //     console.warn(`Unknown background type: ${backgroundType}`);
      //     // this.renderProceduralBackground();
      //     break;
      // }
    }
    
    this.ctx.restore();
  }
  
  private renderLakeBackground() {
    // Lake background - blues and reflections
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.ctx.canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.3, '#E0F6FF'); // Light blue
    gradient.addColorStop(0.7, '#4682B4'); // Steel blue (water)
    gradient.addColorStop(1, '#2F4F4F'); // Dark slate gray (deep water)
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    // Add some gentle ripples/texture
    this.ctx.globalAlpha = 0.1;
    for (let i = 0; i < 5; i++) {
      const y = this.ctx.canvas.height * (0.6 + i * 0.05);
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.ctx.canvas.width, y);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }
  
  private renderMountainBackground() {
    // Mountain background - earth tones and peaks
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.ctx.canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(0.4, '#DDA0DD'); // Plum (distant mountains)
    gradient.addColorStop(0.7, '#8FBC8F'); // Dark sea green (hills)
    gradient.addColorStop(1, '#556B2F'); // Dark olive green (foreground)
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    // Add mountain silhouettes
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = '#696969';
    const peaks = [0.2, 0.35, 0.6, 0.8];
    peaks.forEach(peak => {
      const x = this.ctx.canvas.width * peak;
      const baseY = this.ctx.canvas.height * 0.6;
      const peakY = this.ctx.canvas.height * 0.3;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x - 50, baseY);
      this.ctx.lineTo(x, peakY);
      this.ctx.lineTo(x + 50, baseY);
      this.ctx.closePath();
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }
  
  private renderProceduralBackground() {
    // Original procedural background for fallback
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
    // Use centralized logic for determining if unit should render
    if (!this.unitRenderer.shouldRenderUnit(unit)) {
      return;
    }
    
    // Check for damage blinking using centralized logic
    if (this.unitRenderer.shouldBlinkFromDamage(unit, this.animationTime)) {
      return;
    }

    // Get render position from centralized renderer
    const renderPos = this.unitRenderer.getRenderPosition(unit, this.unitInterpolations);
    const renderX = renderPos.x;
    const renderY = renderPos.y;
    const renderZ = renderPos.z;
    
    // Get sprite dimensions from centralized logic
    const dimensions = this.unitRenderer.getSpriteDimensions(unit);
    const baseWidth = dimensions.width;
    const baseHeight = dimensions.height;
    const isHuge = unit.meta?.huge;
    
    // Cinematic positioning: more compressed vertically, slight perspective scaling
    const battleStripY = this.height * 0.8; // Position battle at bottom
    const yRatio = 1 - (renderY / this.sim.fieldHeight); // Scale Y to fit cinematic strip
    const depthScale = 1  + (yRatio * 1.4); // Front units slightly larger
    const stackingFactor = 0.24; // Compress Y spacing
    
    const cinematicX = renderX * 8;
    const cinematicY = battleStripY - (renderY * 8 * stackingFactor);
    const pixelWidth = Math.round(baseWidth * depthScale);
    const pixelHeight = Math.round(baseHeight * depthScale);
    
    // Adjust for z height
    let finalY = cinematicY;
    if (renderZ > 0) {
      finalY -= renderZ * 4.8;
    }
    
    const sprite = this.sprites.get(unit.sprite);
    if (sprite) {
      // Draw ground shadow for all units in cinematic view (larger for huge units)
      this.ctx.save();
      this.ctx.fillStyle = '#00000040';
      this.ctx.beginPath();
      const shadowWidth = isHuge ? pixelWidth/2.5 : pixelWidth/3;
      const shadowHeight = isHuge ? pixelHeight/8 : pixelHeight/6;
      this.ctx.ellipse(cinematicX, battleStripY - (renderY * 8 * stackingFactor) + pixelHeight/3, 
                       shadowWidth, shadowHeight, 0, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.restore();

      // Get animation frame from centralized logic - this fixes the inconsistency!
      const frameIndex = this.unitRenderer.getAnimationFrame(unit, this.animationTime);
      
      const frameX = frameIndex * baseWidth;
      const pixelX = cinematicX - pixelWidth / 2;
      const pixelY = Math.round(finalY - pixelHeight / 2);
      // Handle sprite flipping using centralized logic
      this.ctx.save();
      const shouldFlip = !this.unitRenderer.shouldFlipSprite(unit);
      
      if (!shouldFlip) {
        // Flip horizontally by scaling x by -1 and translating
        this.ctx.scale(-1, 1);
        this.ctx.translate(-pixelX * 2 - baseWidth, 0);
      }
      this.ctx.drawImage(
        sprite,
        frameX, 0, baseWidth, baseHeight,
        pixelX, pixelY, pixelWidth, pixelHeight
      );
      this.ctx.restore();
    } else {
      // Fallback rectangle using centralized color logic
      this.ctx.fillStyle = this.unitRenderer.getUnitColor(unit);
      this.ctx.fillRect(Math.round(cinematicX - pixelWidth/2), Math.round(finalY - pixelHeight/2), pixelWidth, pixelHeight);
    }
    
    // Draw HP bar (adjusted for cinematic scale)
    if (typeof unit.hp === 'number') {
      const maxHp = unit.maxHp || 100;
      const hpRatio = Math.max(0, Math.min(1, unit.hp / maxHp));
      if (hpRatio < 0.8) {
        this.drawBar("hit points", Math.round(cinematicX - pixelWidth / 2), Math.round(finalY - pixelHeight / 2) - 4, pixelWidth, 2, hpRatio);
      }
    }

    // Draw ability progress bars
    if (unit.abilities && unit.abilities.includes('jumps') && unit.meta.jumping) {
      const ability = Abilities.all.jumps;
      const duration = ability.config?.jumpDuration || 10;
      const progress = unit.meta.jumpProgress || 0;
      const progressRatio = (progress / duration) || 0;
      if (progressRatio > 0 && progressRatio < 1) {
        this.drawBar("jump progress", Math.round(cinematicX - pixelWidth/2), Math.round(finalY - pixelHeight/2) - 6, pixelWidth, 2, progressRatio, '#ace');
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

  private renderLandedParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;
    
    this.ctx.save();
    
    // Only render particles that are on the ground (z=0 or landed=true)
    const landedParticles = this.sim.particles.filter(p => (p.z || 0) <= 0 || p.landed);
    
    for (const particle of landedParticles) {
      this.renderParticleCinematic(particle);
    }
    
    this.ctx.restore();
  }
  
  private renderFlyingParticles() {
    if (!this.sim.particles || this.sim.particles.length === 0) return;
    
    this.ctx.save();
    
    // Only render particles that are in the air (z>0 and not landed)
    const flyingParticles = this.sim.particles
      .filter(p => (p.z || 0) > 0 && !p.landed)
      .sort((a, b) => (b.z || 0) - (a.z || 0)); // Sort by depth for proper layering
    
    for (const particle of flyingParticles) {
      this.renderParticleCinematic(particle);
    }
    
    this.ctx.restore();
  }
  
  private renderParticleCinematic(particle: any) {
    // Convert grid position to cinematic coordinates
    const scale = Math.min(this.ctx.canvas.width / this.sim.fieldWidth, this.ctx.canvas.height / this.sim.fieldHeight) * 0.8;
    const offsetX = (this.ctx.canvas.width - this.sim.fieldWidth * scale) / 2;
    const offsetY = (this.ctx.canvas.height - this.sim.fieldHeight * scale) / 2;
    
    const cinematicX = particle.pos.x * scale + offsetX;
    const cinematicY = particle.pos.y * scale + offsetY;
    
    // Apply 3D height effect - higher particles appear lighter and slightly offset
    const height = particle.z || 0;
    // const heightEffect = Math.min(height / 20, 1); // Normalize height to 0-1
    let adjustedY = cinematicY - height * 0.8; // Higher particles appear higher on screen
    
    this.ctx.save();
    
    // Apply transparency based on height and age
    const ageEffect = particle.lifetime > 100 ? 1 : particle.lifetime / 100;
    const alpha = Math.min(ageEffect); // * (0.6 + heightEffect * 0.4), 1);
    
    // Type-specific rendering
    if (particle.type === 'leaf') {
      this.renderLeafParticle(particle, cinematicX, adjustedY, alpha);
    } else if (particle.type === 'rain') {
      this.renderRainParticle(particle, cinematicX, adjustedY, alpha);
    } else if (particle.type === 'snow') {
      this.renderSnowParticle(particle, cinematicX, adjustedY, alpha);
    } else if (particle.type === 'debris') { // Fire/spark particles use debris type
      this.renderFireParticle(particle, cinematicX, adjustedY, alpha);
    } else {
      // Generic particle rendering
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(cinematicX, adjustedY, particle.radius * scale, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }
  
  private renderLeafParticle(_particle: any, x: number, y: number, alpha: number) {
    this.ctx.globalAlpha = alpha;
    
    // TODO: Replace with actual leaf sprite (8x8 with 8 frames for animation)
    const leafSprite = this.sprites.get('leaf');
    const frameIndex = Math.floor((this.sim.ticks * 0.1) % 8);
    if (leafSprite) {
      this.ctx.save();
      this.ctx.translate(x, y);
      // this.ctx.rotate((particle.pos.x * 0.1 + this.sim.ticks * 0.02) % (Math.PI * 2));

      // scale
      // this.ctx.scale(scale, scale);

      // Draw at native 8x8 size, centered on the position
      this.ctx.drawImage(leafSprite, frameIndex * 8, 0, 8, 8, -4, -4, 8, 8);
      this.ctx.restore();
    }
    
    // Fallback: Simple leaf shape
    // const rotation = (particle.pos.x * 0.1 + this.sim.ticks * 0.02) % (Math.PI * 2);
    
    // this.ctx.save();
    // this.ctx.translate(x, y);
    // this.ctx.rotate(rotation);
    
    // // Draw leaf as an elongated ellipse with a slight curve
    // this.ctx.fillStyle = particle.color;
    // this.ctx.beginPath();
    // this.ctx.ellipse(0, 0, size * 1.5, size * 0.8, 0, 0, 2 * Math.PI);
    // this.ctx.fill();
    
    // // Add a darker center line for leaf detail
    // if (size > 1) {
    //   this.ctx.strokeStyle = this.adjustColorBrightness(particle.color, -40);
    //   this.ctx.lineWidth = Math.max(0.5, size * 0.1);
    //   this.ctx.beginPath();
    //   this.ctx.moveTo(-size * 1.2, 0);
    //   this.ctx.lineTo(size * 1.2, 0);
    //   this.ctx.stroke();
    // }
    
    // this.ctx.restore();
  }
  
  private renderRainParticle(particle: any, x: number, y: number, alpha: number) {
    this.ctx.globalAlpha = alpha;
    
    // Rain drops are tiny dots with diagonal trailing lines
    const dropSize = particle.radius || 1;
    
    // Draw the main rain drop as a small circle
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, dropSize * 0.5, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw diagonal trailing line based on velocity
    if (particle.vel && !particle.landed) {
      this.ctx.strokeStyle = particle.color;
      this.ctx.lineWidth = Math.max(0.5, dropSize * 0.3);
      this.ctx.globalAlpha = alpha * 0.6; // Make trail slightly transparent
      
      // Calculate trail length based on speed
      const speed = Math.sqrt(particle.vel.x * particle.vel.x + particle.vel.y * particle.vel.y);
      const trailLength = Math.min(speed * 8, 12); // Limit max trail length
      
      // Trail direction is opposite to velocity
      const trailEndX = x - particle.vel.x * trailLength;
      const trailEndY = y - particle.vel.y * trailLength;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(trailEndX, trailEndY);
      this.ctx.stroke();
    }
  }
  
  private renderSnowParticle(particle: any, x: number, y: number, alpha: number) {
    this.ctx.globalAlpha = alpha;
    
    // Snow particles are single pixels with black borders for visibility
    const pixelSize = Math.max(1, Math.round(particle.radius || 0.5));
    
    // Draw black border first (slightly larger)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(Math.floor(x) - 0.5, Math.floor(y) - 0.5, pixelSize + 1, pixelSize + 1);
    
    // Draw white center
    this.ctx.fillStyle = particle.color || '#FFFFFF';
    this.ctx.fillRect(Math.floor(x), Math.floor(y), pixelSize, pixelSize);
    
    // If landed, draw a subtle indicator showing the target cell
    if (particle.landed && particle.targetCell) {
      this.ctx.globalAlpha = alpha * 0.3;
      this.ctx.strokeStyle = '#87CEEB'; // Light blue outline
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        particle.targetCell.x * 8 - 4, 
        particle.targetCell.y * 8 - 4, 
        8, 8
      );
    }
  }
  
  private renderFireParticle(particle: any, x: number, y: number, alpha: number) {
    this.ctx.globalAlpha = alpha;
    
    // Fire particles are glowing sparks with ember-like appearance
    const sparkSize = particle.radius || 1;
    
    // Create glowing effect with multiple layers
    const glowRadius = sparkSize * 2;
    
    // Outer glow (soft orange/red)
    this.ctx.globalAlpha = alpha * 0.2;
    this.ctx.fillStyle = '#FF4500';
    this.ctx.beginPath();
    this.ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Middle glow (brighter)
    this.ctx.globalAlpha = alpha * 0.5;
    this.ctx.fillStyle = '#FF6347';
    this.ctx.beginPath();
    this.ctx.arc(x, y, sparkSize * 1.2, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Core spark (brightest)
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, sparkSize * 0.6, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Add flickering white-hot center for larger sparks
    if (sparkSize > 1 && Simulator.rng.random() < 0.7) {
      this.ctx.globalAlpha = alpha * 0.8;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(x, y, sparkSize * 0.3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    // Add upward-trailing sparks if moving upward (fire rises)
    if (particle.vel && particle.vel.y < 0 && !particle.landed) {
      this.ctx.globalAlpha = alpha * 0.4;
      this.ctx.strokeStyle = particle.color;
      this.ctx.lineWidth = Math.max(0.5, sparkSize * 0.2);
      
      // Short upward trail
      const trailLength = Math.min(Math.abs(particle.vel.y) * 4, 6);
      const trailEndY = y + trailLength; // Trail goes down (opposite to upward movement)
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + particle.vel.x * 2, trailEndY);
      this.ctx.stroke();
    }
  }

  private renderAoEEffectsCinematic() {
    // Query simulator for recent AoE events
    const recentAoEEvents = this.sim.processedEvents.filter(event => 
      event.kind === 'aoe' && 
      event.meta.tick && 
      (this.sim.ticks - event.meta.tick) < 10 // Show for 10 ticks
    );

    for (const event of recentAoEEvents) {
      if (typeof event.target !== 'object' || !('x' in event.target)) continue;
      
      const pos = event.target as {x: number, y: number};
      const radius = event.meta.radius || 3;
      const age = event.meta.tick ? (this.sim.ticks - event.meta.tick) : 0;
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