/**
 * TextRenderer - Font atlas-based text rendering system
 * 
 * Manages font atlases and provides text rendering capabilities
 * for the game engine, including speech bubbles, damage numbers,
 * and UI text.
 */

export interface FontAtlas {
  image: HTMLImageElement | ImageBitmap | null;
  charWidth: number;
  charHeight: number;
  columns: number;
  rows: number;
  firstChar: number; // ASCII code of first character in atlas
}

export interface TextStyle {
  color?: string;
  scale?: number;
  outline?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
}

export interface BubbleOptions {
  type: 'speech' | 'thought' | 'damage';
  backgroundColor?: string;
  borderColor?: string;
  padding?: number;
  tailSize?: number;
}

export class TextRenderer {
  private tinyFont: FontAtlas;
  private largeFont: FontAtlas;
  private ctx: CanvasRenderingContext2D | null = null;
  
  constructor() {
    // Initialize font atlases with default values
    // These will be loaded from actual images in production
    this.tinyFont = {
      image: null,
      charWidth: 4,
      charHeight: 4,
      columns: 16,
      rows: 8,
      firstChar: 32 // Space character
    };
    
    this.largeFont = {
      image: null,
      charWidth: 16,
      charHeight: 16,
      columns: 16,
      rows: 8,
      firstChar: 32
    };
  }
  
  /**
   * Set the canvas context for rendering
   */
  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }
  
  /**
   * Load font atlas images
   */
  async loadFontAtlas(fontType: 'tiny' | 'large', imagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (fontType === 'tiny') {
          this.tinyFont.image = img;
        } else {
          this.largeFont.image = img;
        }
        resolve();
      };
      img.onerror = reject;
      img.src = imagePath;
    });
  }
  
  /**
   * Check if fonts are ready for rendering
   */
  get fontsReady(): boolean {
    return this.tinyFont.image !== null || this.largeFont.image !== null;
  }
  
  /**
   * Render text using the font atlas
   */
  drawText(
    text: string,
    x: number,
    y: number,
    fontType: 'tiny' | 'large' = 'tiny',
    style: TextStyle = {}
  ): void {
    if (!this.ctx) {
      console.warn('TextRenderer: No context set');
      return;
    }
    
    const font = fontType === 'tiny' ? this.tinyFont : this.largeFont;
    const scale = style.scale || 1;
    
    // If no font atlas loaded, fallback to canvas text
    if (!font.image) {
      this.drawFallbackText(text, x, y, fontType, style);
      return;
    }
    
    // Draw each character from the atlas
    const charWidth = font.charWidth * scale;
    const charHeight = font.charHeight * scale;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCode = char.charCodeAt(0);
      const atlasIndex = charCode - font.firstChar;
      
      if (atlasIndex < 0 || atlasIndex >= font.columns * font.rows) {
        continue; // Character not in atlas
      }
      
      const col = atlasIndex % font.columns;
      const row = Math.floor(atlasIndex / font.columns);
      
      const srcX = col * font.charWidth;
      const srcY = row * font.charHeight;
      const destX = x + i * charWidth;
      
      // Draw outline if requested
      if (style.outline) {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        // Draw character multiple times for outline effect
        const outlineWidth = style.outlineWidth || 1;
        for (let ox = -outlineWidth; ox <= outlineWidth; ox++) {
          for (let oy = -outlineWidth; oy <= outlineWidth; oy++) {
            if (ox !== 0 || oy !== 0) {
              this.ctx.filter = `brightness(0) saturate(100%)`;
              this.ctx.drawImage(
                font.image,
                srcX, srcY, font.charWidth, font.charHeight,
                destX + ox, y + oy, charWidth, charHeight
              );
            }
          }
        }
        this.ctx.restore();
      }
      
      // Draw the character
      this.ctx.save();
      if (style.color) {
        // Apply color filter
        this.ctx.filter = this.getColorFilter(style.color);
      }
      
      this.ctx.drawImage(
        font.image,
        srcX, srcY, font.charWidth, font.charHeight,
        destX, y, charWidth, charHeight
      );
      
      this.ctx.restore();
    }
  }
  
  /**
   * Fallback text rendering using canvas API
   */
  private drawFallbackText(
    text: string,
    x: number,
    y: number,
    fontType: 'tiny' | 'large',
    style: TextStyle
  ): void {
    if (!this.ctx) return;
    
    this.ctx.save();
    
    const fontSize = fontType === 'tiny' ? 8 : 16;
    const scale = style.scale || 1;
    this.ctx.font = `${fontSize * scale}px monospace`;
    
    // Draw outline
    if (style.outline) {
      this.ctx.strokeStyle = style.outlineColor || '#000000';
      this.ctx.lineWidth = (style.outlineWidth || 1) * scale;
      this.ctx.strokeText(text, x, y);
    }
    
    // Draw text
    this.ctx.fillStyle = style.color || '#FFFFFF';
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }
  
  /**
   * Draw a speech/thought bubble with text
   */
  drawBubble(
    text: string,
    x: number,
    y: number,
    options: BubbleOptions = { type: 'speech' }
  ): void {
    if (!this.ctx) return;
    
    const padding = options.padding || 8;
    const tailSize = options.tailSize || 6;
    const charWidth = 4; // Using tiny font
    const charHeight = 4;
    
    const bubbleWidth = text.length * charWidth + padding * 2;
    const bubbleHeight = charHeight + padding * 2;
    
    this.ctx.save();
    
    // Draw bubble background
    this.ctx.fillStyle = options.backgroundColor || 'rgba(0, 0, 0, 0.8)';
    this.ctx.strokeStyle = options.borderColor || 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    
    // Draw rounded rectangle
    this.drawRoundedRect(
      x - bubbleWidth / 2,
      y - bubbleHeight - tailSize,
      bubbleWidth,
      bubbleHeight,
      4
    );
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw tail
    if (options.type === 'speech') {
      this.drawSpeechTail(x, y - tailSize, tailSize);
    } else if (options.type === 'thought') {
      this.drawThoughtBubbles(x, y - tailSize, tailSize);
    }
    
    // Draw text
    this.drawText(
      text,
      x - bubbleWidth / 2 + padding,
      y - bubbleHeight - tailSize + padding,
      'tiny',
      { color: '#FFFFFF' }
    );
    
    this.ctx.restore();
  }
  
  /**
   * Draw floating damage numbers
   */
  drawDamageNumber(
    damage: number,
    x: number,
    y: number,
    floatOffset: number = 0,
    critical: boolean = false
  ): void {
    if (!this.ctx) return;
    
    const text = `-${damage}`;
    const adjustedY = y - floatOffset;
    
    this.drawText(
      text,
      x,
      adjustedY,
      critical ? 'large' : 'tiny',
      {
        color: critical ? '#FF0000' : '#FFFF00',
        outline: true,
        outlineColor: '#000000',
        scale: critical ? 1.5 : 1
      }
    );
  }
  
  /**
   * Draw a rounded rectangle
   */
  private drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (!this.ctx) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }
  
  /**
   * Draw speech bubble tail
   */
  private drawSpeechTail(x: number, y: number, size: number): void {
    if (!this.ctx) return;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - size / 2, y);
    this.ctx.lineTo(x + size / 2, y);
    this.ctx.lineTo(x, y + size);
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  /**
   * Draw thought bubble dots
   */
  private drawThoughtBubbles(x: number, y: number, size: number): void {
    if (!this.ctx) return;
    
    for (let i = 0; i < 3; i++) {
      const dotY = y + i * (size / 3);
      const dotRadius = (3 - i) * 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(x, dotY, dotRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }
  
  /**
   * Convert color to CSS filter (approximation)
   */
  private getColorFilter(color: string): string {
    // This is a simplified version - in production you'd want
    // a more sophisticated color matrix transformation
    if (color === '#FF0000') return 'hue-rotate(0deg) saturate(2)';
    if (color === '#00FF00') return 'hue-rotate(90deg) saturate(2)';
    if (color === '#0000FF') return 'hue-rotate(200deg) saturate(2)';
    if (color === '#FFFF00') return 'hue-rotate(50deg) saturate(2)';
    return '';
  }
  
  /**
   * Measure text width in pixels
   */
  measureText(text: string, fontType: 'tiny' | 'large' = 'tiny', scale: number = 1): number {
    const font = fontType === 'tiny' ? this.tinyFont : this.largeFont;
    return text.length * font.charWidth * scale;
  }
  
  /**
   * Get font height in pixels
   */
  getFontHeight(fontType: 'tiny' | 'large' = 'tiny', scale: number = 1): number {
    const font = fontType === 'tiny' ? this.tinyFont : this.largeFont;
    return font.charHeight * scale;
  }
}