/**
 * ParticleRenderer - Common particle rendering logic across all view modes
 * Handles sprite-based particle rendering with proper animation and effects
 */

export interface ParticleRenderConfig {
  x: number;
  y: number;
  alpha: number;
  scale?: number;
}

export class ParticleRenderer {
  private sprites: Map<string, HTMLImageElement>;
  
  constructor(sprites: Map<string, HTMLImageElement>) {
    this.sprites = sprites;
  }

  renderParticle(
    ctx: CanvasRenderingContext2D,
    particle: any,
    config: ParticleRenderConfig
  ): void {
    const { x, y, alpha, scale = 1 } = config;
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Render based on particle type
    switch (particle.type) {
      case 'leaf':
      case 'leaves':
        this.renderLeafParticle(ctx, particle, x, y, scale);
        break;
      case 'rain':
        this.renderRainParticle(ctx, particle, x, y, scale);
        break;
      case 'snow':
        this.renderSnowParticle(ctx, particle, x, y, scale);
        break;
      case 'debris':
      case 'fire':
      case 'spark':
        this.renderFireParticle(ctx, particle, x, y, scale);
        break;
      case 'lightning':
      case 'electric_spark':
        this.renderLightningParticle(ctx, particle, x, y, scale);
        break;
      default:
        this.renderGenericParticle(ctx, particle, x, y, scale);
        break;
    }
    
    ctx.restore();
  }

  private renderLeafParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    const leafSprite = this.sprites.get('leaf');
    if (leafSprite) {
      // Use particle lifetime for sprite animation frame (8 frames total)
      const frame = Math.floor((particle.lifetime / 10) % 8);
      const frameWidth = 8;
      const frameHeight = 8;
      
      ctx.save();
      ctx.translate(x, y);
      
      // Add slight rotation based on position and time for natural movement
      const rotation = (particle.pos.x * 0.1 + particle.lifetime * 0.02) % (Math.PI * 2);
      ctx.rotate(rotation);
      
      const drawWidth = frameWidth * scale;
      const drawHeight = frameHeight * scale;
      
      ctx.drawImage(
        leafSprite,
        frame * frameWidth, 0, frameWidth, frameHeight,
        -drawWidth/2, -drawHeight/2, drawWidth, drawHeight
      );
      ctx.restore();
    } else {
      // Fallback to simple leaf shape
      this.renderLeafFallback(ctx, particle, x, y, scale);
    }
  }

  private renderLeafFallback(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    ctx.fillStyle = particle.color || '#228B22';
    ctx.save();
    ctx.translate(x, y);
    const rotation = (particle.pos.x * 0.1 + particle.lifetime * 0.02) % (Math.PI * 2);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * scale, 2 * scale, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  private renderRainParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    ctx.strokeStyle = particle.color || '#4169E1';
    ctx.lineWidth = Math.max(0.5, 1 * scale);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (particle.vel?.x || 0) * 2 * scale, y + (particle.vel?.y || 2) * scale);
    ctx.stroke();
  }

  private renderSnowParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    ctx.fillStyle = particle.color || '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, (particle.radius || 2) * scale, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add sparkle effect for snow
    if (scale > 0.5) {
      ctx.strokeStyle = '#E6E6FA';
      ctx.lineWidth = 0.5;
      const sparkleSize = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x - sparkleSize, y);
      ctx.lineTo(x + sparkleSize, y);
      ctx.moveTo(x, y - sparkleSize);
      ctx.lineTo(x, y + sparkleSize);
      ctx.stroke();
    }
  }

  private renderFireParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // Fire particles use gradient from yellow to red
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, (particle.radius || 3) * scale);
    gradient.addColorStop(0, '#FFFF00');
    gradient.addColorStop(0.5, '#FF6600');
    gradient.addColorStop(1, particle.color || '#FF0000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, (particle.radius || 3) * scale, 0, 2 * Math.PI);
    ctx.fill();
  }

  private renderLightningParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    const lightningSprite = this.sprites.get('lightning');
    if (lightningSprite) {
      // Lightning sprite animation
      const frame = Math.floor((particle.lifetime / 3) % 4); // Fast animation
      const frameWidth = 16;
      const frameHeight = 16;
      
      const drawWidth = frameWidth * scale;
      const drawHeight = frameHeight * scale;
      
      ctx.drawImage(
        lightningSprite,
        frame * frameWidth, 0, frameWidth, frameHeight,
        x - drawWidth/2, y - drawHeight/2, drawWidth, drawHeight
      );
    } else {
      // Fallback to bright electric effect
      ctx.fillStyle = particle.color || '#FFFFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 5 * scale;
      ctx.beginPath();
      ctx.arc(x, y, (particle.radius || 2) * scale, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    }
  }

  private renderGenericParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // Fallback rendering for unknown particle types
    ctx.fillStyle = particle.color || '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x, y, (particle.radius || 2) * scale, 0, 2 * Math.PI);
    ctx.fill();
  }
}