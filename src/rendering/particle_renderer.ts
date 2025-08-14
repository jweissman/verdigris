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
    
    // For 1-bit aesthetic, don't use alpha - either draw or don't
    // If alpha would be too low, don't draw at all
    if (alpha < 0.5) return;
    
    ctx.save();
    // No alpha blending for 1-bit aesthetic
    
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
    ctx.fillStyle = '#000000'; // BLACK only for 1-bit aesthetic
    ctx.save();
    ctx.translate(x, y);
    const rotation = (particle.pos.x * 0.1 + particle.lifetime * 0.02) % (Math.PI * 2);
    ctx.rotate(rotation);
    // Simple 2x2 pixel square for minimal leaf
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  private renderRainParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // Simple black pixel for rain - 1-bit aesthetic
    ctx.fillStyle = '#000000';
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  private renderSnowParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // Black pixel for snow in 1-bit style
    ctx.fillStyle = '#000000';
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  private renderFireParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // Use fire sprite if available, otherwise black pixel
    const fireSprite = this.sprites.get('fire-particle');
    if (fireSprite) {
      const frame = Math.floor((particle.lifetime / 5) % 4);
      ctx.drawImage(fireSprite, frame * 8, 0, 8, 8, x - 4, y - 4, 8, 8);
    } else {
      // Flickering black pixel
      if (Math.floor(particle.lifetime / 2) % 2 === 0) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
      }
    }
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
      // Simple black pixel for lightning
      ctx.fillStyle = '#000000';
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3);
    }
  }

  private renderGenericParticle(ctx: CanvasRenderingContext2D, particle: any, x: number, y: number, scale: number): void {
    // All particles are black pixels for 1-bit aesthetic
    ctx.fillStyle = '#000000';
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
}