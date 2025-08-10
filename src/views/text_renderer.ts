export class TextRenderer {
  private ctx: CanvasRenderingContext2D;
  public fontsReady: boolean = false;
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    // For now, mark fonts as ready immediately
    // In a real implementation, we'd load font atlas images
    this.fontsReady = true;
  }
  
  drawSpeechBubble(text: string, x: number, y: number, useTiny: boolean = true) {
    // Calculate bubble dimensions based on text length
    const bubbleWidth = text.length * (useTiny ? 4 : 8) + 12;
    const bubbleHeight = (useTiny ? 8 : 16) + 8;
    
    // Draw bubble background
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    
    // Draw rounded rectangle
    this.roundRect(x - bubbleWidth/2, y - bubbleHeight - 10, bubbleWidth, bubbleHeight, 4);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Draw bubble tail
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.moveTo(x - 5, y - 10);
    this.ctx.lineTo(x + 5, y - 10);
    this.ctx.lineTo(x, y - 2);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = useTiny ? '8px monospace' : '12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y - bubbleHeight/2 - 10);
    
    this.ctx.restore();
  }
  
  drawThoughtBubble(text: string, x: number, y: number, useTiny: boolean = true) {
    // Similar to speech bubble but with cloud-like appearance
    this.drawSpeechBubble(text, x, y, useTiny);
    
    // Add thought bubble dots
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    
    // Draw three dots descending
    for (let i = 0; i < 3; i++) {
      const dotY = y - 2 - i * 4;
      const dotRadius = 2 - i * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(x, dotY, dotRadius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }
  
  drawStatusText(text: string, x: number, y: number, color: string = '#FFFFFF', floatOffset: number = 0) {
    this.ctx.save();
    
    // Apply float effect
    const floatY = y - floatOffset;
    
    // Draw text with outline for visibility
    this.ctx.font = 'bold 10px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Black outline
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeText(text, x, floatY);
    
    // Colored text
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, floatY);
    
    this.ctx.restore();
  }
  
  drawTinyText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    this.ctx.save();
    
    this.ctx.fillStyle = color;
    this.ctx.font = `${8 * scale}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }
  
  drawLargeText(text: string, x: number, y: number, color: string = '#FFFFFF', scale: number = 1) {
    this.ctx.save();
    
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${16 * scale}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, x, y);
    
    this.ctx.restore();
  }
  
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
}