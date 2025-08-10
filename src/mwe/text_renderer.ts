/**
 * Text Renderer
 * Handles rendering text using font atlases for in-game UI
 * Supports both large (16x16) and tiny (4x4) fonts
 */
export default class TextRenderer {
  private largeFont: HTMLImageElement | null = null;
  private tinyFont: HTMLImageElement | null = null;
  private ctx: CanvasRenderingContext2D;
  
  // Font metrics
  private readonly LARGE_CHAR_WIDTH = 16;
  private readonly LARGE_CHAR_HEIGHT = 16;
  private readonly TINY_CHAR_WIDTH = 4;
  private readonly TINY_CHAR_HEIGHT = 4;
  
  // Character map for the font atlas (assuming ASCII layout)
  // The atlas typically has 16 chars per row, starting from space (32)
  private readonly CHARS_PER_ROW = 16;
  private readonly FIRST_CHAR_CODE = 32; // Space character
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.loadFonts();
  }
  
  private loadFonts() {
    // Load large font
    this.largeFont = new Image();
    this.largeFont.src = '/src/assets/stenciled-16x16.png';
    this.largeFont.onerror = () => {
      console.warn('Failed to load large font atlas');
    };
    
    // Load tiny font
    this.tinyFont = new Image();
    this.tinyFont.src = '/src/assets/teeny-4x4.png';
    this.tinyFont.onerror = () => {
      console.warn('Failed to load tiny font atlas');
    };
  }
  
  /**
   * Draw text using the large font
   */
  drawLargeText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    if (!this.largeFont || !this.largeFont.complete) return;
    
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    
    // Apply color tint using composition
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = this.LARGE_CHAR_WIDTH;
    tempCanvas.height = this.LARGE_CHAR_HEIGHT;
    
    let currentX = x;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charCode = char.charCodeAt(0);
      
      // Skip unsupported characters
      if (charCode < this.FIRST_CHAR_CODE) {
        currentX += this.LARGE_CHAR_WIDTH * scale * 0.5; // Space for unsupported
        continue;
      }
      
      // Calculate position in atlas
      const atlasIndex = charCode - this.FIRST_CHAR_CODE;
      const atlasX = (atlasIndex % this.CHARS_PER_ROW) * this.LARGE_CHAR_WIDTH;
      const atlasY = Math.floor(atlasIndex / this.CHARS_PER_ROW) * this.LARGE_CHAR_HEIGHT;
      
      // Clear temp canvas
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw character to temp canvas
      tempCtx.drawImage(
        this.largeFont,
        atlasX, atlasY, this.LARGE_CHAR_WIDTH, this.LARGE_CHAR_HEIGHT,
        0, 0, this.LARGE_CHAR_WIDTH, this.LARGE_CHAR_HEIGHT
      );
      
      // Apply color
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = color;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw to main canvas
      this.ctx.drawImage(
        tempCanvas,
        0, 0, this.LARGE_CHAR_WIDTH, this.LARGE_CHAR_HEIGHT,
        currentX, y, this.LARGE_CHAR_WIDTH * scale, this.LARGE_CHAR_HEIGHT * scale
      );
      
      currentX += this.LARGE_CHAR_WIDTH * scale;
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw text using the tiny font
   */
  drawTinyText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    if (!this.tinyFont || !this.tinyFont.complete) return;
    
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    
    // Apply color tint using composition
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = this.TINY_CHAR_WIDTH;
    tempCanvas.height = this.TINY_CHAR_HEIGHT;
    
    let currentX = x;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i].toUpperCase(); // Tiny font is usually uppercase only
      const charCode = char.charCodeAt(0);
      
      // Skip unsupported characters
      if (charCode < this.FIRST_CHAR_CODE) {
        currentX += this.TINY_CHAR_WIDTH * scale * 0.5;
        continue;
      }
      
      // Calculate position in atlas
      const atlasIndex = charCode - this.FIRST_CHAR_CODE;
      const atlasX = (atlasIndex % this.CHARS_PER_ROW) * this.TINY_CHAR_WIDTH;
      const atlasY = Math.floor(atlasIndex / this.CHARS_PER_ROW) * this.TINY_CHAR_HEIGHT;
      
      // Clear temp canvas
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw character to temp canvas
      tempCtx.drawImage(
        this.tinyFont,
        atlasX, atlasY, this.TINY_CHAR_WIDTH, this.TINY_CHAR_HEIGHT,
        0, 0, this.TINY_CHAR_WIDTH, this.TINY_CHAR_HEIGHT
      );
      
      // Apply color
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.fillStyle = color;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      
      // Draw to main canvas
      this.ctx.drawImage(
        tempCanvas,
        0, 0, this.TINY_CHAR_WIDTH, this.TINY_CHAR_HEIGHT,
        currentX, y, this.TINY_CHAR_WIDTH * scale, this.TINY_CHAR_HEIGHT * scale
      );
      
      currentX += this.TINY_CHAR_WIDTH * scale;
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw a speech bubble with text
   */
  drawSpeechBubble(text: string, x: number, y: number, useTiny: boolean = true) {
    const charWidth = useTiny ? this.TINY_CHAR_WIDTH : this.LARGE_CHAR_WIDTH;
    const charHeight = useTiny ? this.TINY_CHAR_HEIGHT : this.LARGE_CHAR_HEIGHT;
    const scale = useTiny ? 2 : 1; // Scale up tiny font for readability
    
    const bubbleWidth = text.length * charWidth * scale + 8;
    const bubbleHeight = charHeight * scale + 8;
    
    // Draw bubble background
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    
    // Bubble body
    this.roundRect(x - bubbleWidth/2, y - bubbleHeight - 10, bubbleWidth, bubbleHeight, 4);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Bubble tail
    this.ctx.beginPath();
    this.ctx.moveTo(x - 4, y - 10);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x + 4, y - 10);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw text
    const textX = x - (text.length * charWidth * scale) / 2;
    const textY = y - bubbleHeight - 6;
    
    if (useTiny) {
      this.drawTinyText(text, textX, textY, '#FFFFFF', scale);
    } else {
      this.drawLargeText(text, textX, textY, '#FFFFFF', scale);
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw a thought bubble (for internal AI state)
   */
  drawThoughtBubble(text: string, x: number, y: number) {
    const scale = 2;
    const bubbleWidth = text.length * this.TINY_CHAR_WIDTH * scale + 8;
    const bubbleHeight = this.TINY_CHAR_HEIGHT * scale + 8;
    
    // Draw cloud-like bubble
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.strokeStyle = '#888888';
    this.ctx.lineWidth = 1;
    
    // Cloud body (multiple circles)
    const cloudX = x - bubbleWidth/2;
    const cloudY = y - bubbleHeight - 15;
    
    // Draw overlapping circles for cloud effect
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(
        cloudX + (i * bubbleWidth/3) + bubbleWidth/6,
        cloudY + bubbleHeight/2,
        bubbleHeight/2 + 2,
        0, Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.stroke();
    }
    
    // Thought dots
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(x - 6 + i * 6, y - 5 - i * 3, 2 - i * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    }
    
    // Draw text
    const textX = x - (text.length * this.TINY_CHAR_WIDTH * scale) / 2;
    const textY = cloudY + 2;
    this.drawTinyText(text, textX, textY, '#CCCCCC', scale);
    
    this.ctx.restore();
  }
  
  /**
   * Draw status text (damage numbers, healing, etc)
   */
  drawStatusText(text: string, x: number, y: number, color: string = '#FF0000', floatOffset: number = 0) {
    const actualY = y - floatOffset;
    
    this.ctx.save();
    
    // Draw shadow for better visibility
    this.drawTinyText(text, x + 1, actualY + 1, '#000000', 2);
    // Draw main text
    this.drawTinyText(text, x, actualY, color, 2);
    
    this.ctx.restore();
  }
  
  /**
   * Helper function to draw rounded rectangles
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
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
   * Check if fonts are loaded and ready
   */
  get fontsReady(): boolean {
    return !!(this.largeFont?.complete && this.tinyFont?.complete);
  }
}

export class TextReviewer {
            constructor() {
                this.canvas = document.getElementById('fontCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.charsetCanvas = document.getElementById('charsetCanvas');
                this.charsetCtx = this.charsetCanvas.getContext('2d');
                
                this.textRenderer = new TextRenderer(this.ctx);
                this.charsetRenderer = new TextRenderer(this.charsetCtx);
                
                this.setupControls();
                this.animate();
            }
            
            setupControls() {
                // Input handlers
                document.getElementById('textInput').addEventListener('input', () => this.render());
                document.getElementById('fontSelect').addEventListener('change', () => this.render());
                document.getElementById('colorInput').addEventListener('input', () => this.render());
                document.getElementById('bubbleType').addEventListener('change', () => this.render());
                
                const scaleInput = document.getElementById('scaleInput');
                scaleInput.addEventListener('input', (e) => {
                    document.getElementById('scaleValue').textContent = e.target.value;
                    this.render();
                });
                
                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    switch(e.key) {
                        case 'f':
                        case 'F':
                            this.toggleFont();
                            break;
                        case 'b':
                        case 'B':
                            this.cycleBubble();
                            break;
                        case '+':
                        case '=':
                            this.adjustScale(1);
                            break;
                        case '-':
                        case '_':
                            this.adjustScale(-1);
                            break;
                        case '1':
                            this.setPreset('OOF!');
                            break;
                        case '2':
                            this.setPreset('WORMSIGN');
                            break;
                        case '3':
                            this.setPreset('GRAPPLED');
                            break;
                        case '4':
                            this.setPreset('MECHATRON');
                            break;
                        case '5':
                            this.setPreset('CRITICAL!');
                            break;
                        case '6':
                            this.setPreset('GAME OVER');
                            break;
                    }
                });
            }
            
            toggleFont() {
                const select = document.getElementById('fontSelect');
                select.selectedIndex = (select.selectedIndex + 1) % 2;
                this.render();
            }
            
            cycleBubble() {
                const select = document.getElementById('bubbleType');
                select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
                this.render();
            }
            
            adjustScale(delta) {
                const input = document.getElementById('scaleInput');
                const newValue = Math.max(1, Math.min(8, parseInt(input.value) + delta));
                input.value = newValue;
                document.getElementById('scaleValue').textContent = newValue;
                this.render();
            }
            
            setPreset(text) {
                document.getElementById('textInput').value = text;
                this.render();
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
                const text = document.getElementById('textInput').value;
                const font = document.getElementById('fontSelect').value;
                const color = document.getElementById('colorInput').value;
                const scale = parseInt(document.getElementById('scaleInput').value);
                const bubbleType = document.getElementById('bubbleType').value;
                
                // Center position
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // Render based on bubble type
                if (bubbleType === 'speech') {
                    this.textRenderer.drawSpeechBubble(text, centerX, centerY, font === 'tiny');
                } else if (bubbleType === 'thought') {
                    this.textRenderer.drawThoughtBubble(text, centerX, centerY);
                } else if (bubbleType === 'damage') {
                    const floatOffset = Math.sin(Date.now() / 200) * 10 + 10;
                    this.textRenderer.drawStatusText(text, centerX, centerY, color, floatOffset);
                } else {
                    // Plain text
                    if (font === 'tiny') {
                        const textWidth = text.length * 4 * scale;
                        this.textRenderer.drawTinyText(
                            text, 
                            centerX - textWidth / 2, 
                            centerY - 2 * scale, 
                            color, 
                            scale
                        );
                    } else {
                        const textWidth = text.length * 16 * scale;
                        this.textRenderer.drawLargeText(
                            text, 
                            centerX - textWidth / 2, 
                            centerY - 8 * scale, 
                            color, 
                            scale
                        );
                    }
                }
                
                // Show text dimensions
                this.ctx.fillStyle = '#0F0';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(`Text: "${text}" (${text.length} chars)`, 10, 20);
                this.ctx.fillText(`Font: ${font}, Scale: ${scale}x`, 10, 35);
            }
            
            renderCharset() {
                // Clear canvas
                this.charsetCtx.fillStyle = '#111';
                this.charsetCtx.fillRect(0, 0, this.charsetCanvas.width, this.charsetCanvas.height);
                
                const font = document.getElementById('fontSelect').value;
                const scale = 2;
                
                // Draw character set
                let x = 10;
                let y = 30;
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()+-=[]{}|;:,.<>?/';
                
                for (let i = 0; i < chars.length; i++) {
                    const char = chars[i];
                    
                    if (font === 'tiny') {
                        this.charsetRenderer.drawTinyText(char, x, y, '#FFF', scale);
                        x += 12;
                    } else {
                        this.charsetRenderer.drawLargeText(char, x, y, '#FFF', 1);
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
  // Expose TextReviewer globally for easy access in the HTML page
  window.addEventListener('load', () => {
    window.textReview = new TextReviewer();
  });
}