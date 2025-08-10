/**
 * Text Renderer MWE
 * Simple font atlas implementation for testing
 */
import largeFont from '../assets/stenciled-16x16.png';
import tinyFont from '../assets/teeny-4x4.png';

export default class TextRenderer {
  private ctx: CanvasRenderingContext2D;
  private largeFontImage: HTMLImageElement | null = null;
  private tinyFontImage: HTMLImageElement | null = null;
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.loadFonts();
  }
  
  get fontsReady(): boolean {
    return !!(this.largeFontImage?.complete && this.tinyFontImage?.complete &&
              this.largeFontImage.naturalWidth > 0 && this.tinyFontImage.naturalWidth > 0);
  }
  
  private loadFonts() {
    this.largeFontImage = new Image();
    this.largeFontImage.src = largeFont;
    this.largeFontImage.onload = () => {
      console.log(`Large font loaded: ${this.largeFontImage!.width}x${this.largeFontImage!.height}`);
    };
    this.largeFontImage.onerror = (e) => {
      console.error('Failed to load large font:', e);
    };
    
    this.tinyFontImage = new Image();
    this.tinyFontImage.src = tinyFont;
    this.tinyFontImage.onload = () => {
      console.log(`Tiny font loaded: ${this.tinyFontImage!.width}x${this.tinyFontImage!.height}`);
    };
    this.tinyFontImage.onerror = (e) => {
      console.error('Failed to load tiny font:', e);
    };
  }
  
  drawTinyText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    if (!this.tinyFontImage?.complete || this.tinyFontImage.naturalWidth === 0) {
      console.warn('Tiny font not ready');
      return;
    }
    
    // teeny-4x4.png is 48x64 = 12 chars wide, ~16 chars high, 4x4 per char
    this.drawAtlasText(text, x, y, color, scale, 4, 4, this.tinyFontImage, 12);
  }
  
  drawLargeText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    if (!this.largeFontImage?.complete || this.largeFontImage.naturalWidth === 0) {
      console.warn('Large font not ready');
      return;
    }
    
    // stenciled-16x16.png is 64x144 = 4 chars wide, 9 chars high, 16x16 per char
    this.drawAtlasText(text, x, y, color, scale, 16, 16, this.largeFontImage, 4);
  }
  
  private drawAtlasText(text: string, x: number, y: number, _color: string, scale: number, 
                       charWidth: number, charHeight: number, font: HTMLImageElement, charsPerRow: number) {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i].toUpperCase();
      let atlasIndex = -1;
      
      // Map characters to atlas positions
      // Assuming layout: A-Z (0-25), then 0-9 (26-35)
      if (char >= 'A' && char <= 'Z') {
        atlasIndex = char.charCodeAt(0) - 'A'.charCodeAt(0);
      } else if (char >= '0' && char <= '9') {
        atlasIndex = 26 + (char.charCodeAt(0) - '0'.charCodeAt(0));
      } else if (char === ' ') {
        currentX += charWidth * scale;
        continue;
      } else {
        // Skip unsupported characters
        currentX += charWidth * scale * 0.5;
        continue;
      }
      
      const atlasX = (atlasIndex % charsPerRow) * charWidth;
      const atlasY = Math.floor(atlasIndex / charsPerRow) * charHeight;
      
      // Draw character
      this.ctx.drawImage(
        font,
        atlasX, atlasY, charWidth, charHeight,
        currentX, y, charWidth * scale, charHeight * scale
      );
      
      currentX += charWidth * scale;
    }
    
    this.ctx.restore();
  }
  
  drawSpeechBubble(text: string, x: number, y: number, useTiny: boolean = true) {
    const charWidth = useTiny ? 4 : 16;
    const scale = useTiny ? 2 : 1;
    const bubbleWidth = text.length * charWidth * scale + 8;
    const bubbleHeight = charWidth * scale + 8;
    
    // Draw bubble
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    
    const bubbleX = x - bubbleWidth/2;
    const bubbleY = y - bubbleHeight - 10;
    
    this.ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    this.ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    
    // Draw tail
    this.ctx.beginPath();
    this.ctx.moveTo(x - 4, y - 10);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x + 4, y - 10);
    this.ctx.fill();
    
    // Draw text
    const textX = x - (text.length * charWidth * scale) / 2;
    const textY = bubbleY + 2;
    
    if (useTiny) {
      this.drawTinyText(text, textX, textY, '#FFFFFF', scale);
    } else {
      this.drawLargeText(text, textX, textY, '#FFFFFF', scale);
    }
    
    this.ctx.restore();
  }
}

export class TextReviewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private charsetCanvas: HTMLCanvasElement;
  private charsetCtx: CanvasRenderingContext2D;
  private renderer: TextRenderer;

  constructor() {
    this.canvas = document.getElementById('fontCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.charsetCanvas = document.getElementById('charsetCanvas') as HTMLCanvasElement;
    this.charsetCtx = this.charsetCanvas.getContext('2d')!;
    
    this.renderer = new TextRenderer(this.ctx);
    
    this.setupControls();
    this.animate();
  }

  setupControls() {
    // Input handlers
    document.getElementById('textInput')!.addEventListener('input', () => this.render());
    document.getElementById('fontSelect')!.addEventListener('change', () => this.render());
    document.getElementById('colorInput')!.addEventListener('input', () => this.render());
    document.getElementById('bubbleType')!.addEventListener('change', () => this.render());
    
    const scaleInput = document.getElementById('scaleInput')! as HTMLInputElement;
    scaleInput.addEventListener('input', (e) => {
      document.getElementById('scaleValue')!.textContent = (e.target as HTMLInputElement).value;
      this.render();
    });
  }

  animate() {
    this.render();
    this.renderCharset();
    requestAnimationFrame(() => this.animate());
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid for reference
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 16) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 16) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    // Get settings
    const text = (document.getElementById('textInput') as HTMLInputElement).value;
    const font = (document.getElementById('fontSelect') as HTMLSelectElement).value as 'tiny' | 'large';
    const color = (document.getElementById('colorInput') as HTMLInputElement).value;
    const scale = parseInt((document.getElementById('scaleInput') as HTMLInputElement).value);
    const bubbleType = (document.getElementById('bubbleType') as HTMLSelectElement).value;
    
    // Center position
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Render based on bubble type
    const textX = centerX - (text.length * (font === 'tiny' ? 4 : 16) * scale) / 2;
    
    if (bubbleType === 'speech') {
      this.renderer.drawSpeechBubble(text, centerX, centerY, font === 'tiny');
    } else {
      // Plain text
      if (font === 'tiny') {
        this.renderer.drawTinyText(text, textX, centerY, color, scale);
      } else {
        this.renderer.drawLargeText(text, textX, centerY, color, scale);
      }
    }
    
    // Show text info
    this.ctx.fillStyle = '#0F0';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`Text: "${text}" (${text.length} chars)`, 10, 20);
    this.ctx.fillText(`Font: ${font}, Scale: ${scale}x`, 10, 35);
    this.ctx.fillText(`Fonts Ready: ${this.renderer.fontsReady ? 'YES' : 'NO'}`, 10, 50);
  }

  renderCharset() {
    // Clear canvas
    this.charsetCtx.fillStyle = '#111';
    this.charsetCtx.fillRect(0, 0, this.charsetCanvas.width, this.charsetCanvas.height);
    
    const font = (document.getElementById('fontSelect') as HTMLSelectElement).value as 'tiny' | 'large';
    const scale = 2;
    
    // Create temporary renderer for charset canvas
    const charsetRenderer = new TextRenderer(this.charsetCtx);
    
    // Draw character set - A-Z and 0-9
    let x = 10;
    let y = 30;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      
      if (font === 'tiny') {
        charsetRenderer.drawTinyText(char, x, y, '#FFF', scale);
        x += 12;
      } else {
        charsetRenderer.drawLargeText(char, x, y, '#FFF', scale);
        x += 20;
      }
      
      if (x > this.charsetCanvas.width - 40) {
        x = 10;
        y += font === 'tiny' ? 20 : 40;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    (window as any).textReview = new TextReviewer();
  });
}