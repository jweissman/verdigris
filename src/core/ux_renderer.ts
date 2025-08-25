export type UIElement = 
  | { type: "frame"; x: number; y: number; width: number; height: number; style?: FrameStyle; children?: UIElement[] }
  | { type: "slot"; x: number; y: number; width: number; height: number; content?: SlotContent; label?: string }
  | { type: "text"; x: number; y: number; text: string; align?: "left" | "center" | "right"; scale?: number }
  | { type: "prose"; x: number; y: number; width: number; text: string; lineHeight?: number }
  | { type: "graph"; x: number; y: number; width: number; height: number; data: number[]; min?: number; max?: number }
  | { type: "dithered_rect"; x: number; y: number; width: number; height: number; density?: number }
  | { type: "sprite"; x: number; y: number; sprite: HTMLImageElement; frame?: number; scale?: number };

export type FrameStyle = "single" | "double" | "rounded" | "none";

export type SlotContent = 
  | { type: "sprite"; sprite: HTMLImageElement; frame?: number }
  | { type: "text"; text: string }
  | { type: "empty" };

export class UXRenderer {
  private ctx: CanvasRenderingContext2D;
  private fontAtlas: any; // Will use the existing font atlas
  
  // Pure monochrome only
  private readonly BLACK = "#000000";
  private readonly WHITE = "#FFFFFF";
  
  constructor(ctx: CanvasRenderingContext2D, fontAtlas: any) {
    this.ctx = ctx;
    this.fontAtlas = fontAtlas;
  }
  
  render(elements: UIElement[]) {
    for (const element of elements) {
      this.renderElement(element);
    }
  }
  
  private renderElement(element: UIElement) {
    switch (element.type) {
      case "frame":
        this.drawFrame(element.x, element.y, element.width, element.height, element.style);
        if (element.children) {
          for (const child of element.children) {
            // Offset children by parent position
            const offsetChild = this.offsetElement(child, element.x, element.y);
            this.renderElement(offsetChild);
          }
        }
        break;
        
      case "slot":
        this.drawSlot(element.x, element.y, element.width, element.height, element.content, element.label);
        break;
        
      case "text":
        this.drawText(element.x, element.y, element.text, element.align, element.scale);
        break;
        
      case "prose":
        this.drawProse(element.x, element.y, element.width, element.text, element.lineHeight);
        break;
        
      case "graph":
        this.drawGraph(element.x, element.y, element.width, element.height, element.data, element.min, element.max);
        break;
        
      case "dithered_rect":
        this.drawDitheredRect(element.x, element.y, element.width, element.height, element.density || 0.5);
        break;
        
      case "sprite":
        this.drawSprite(element.x, element.y, element.sprite, element.frame, element.scale);
        break;
    }
  }
  
  private offsetElement(element: UIElement, offsetX: number, offsetY: number): UIElement {
    switch (element.type) {
      case "frame":
        return {
          ...element,
          x: element.x + offsetX,
          y: element.y + offsetY,
          children: element.children?.map(c => this.offsetElement(c, 0, 0))
        };
      case "slot":
      case "text":
      case "prose":
      case "graph":
      case "dithered_rect":
      case "sprite":
        return { ...element, x: element.x + offsetX, y: element.y + offsetY };
    }
  }
  
  private drawFrame(x: number, y: number, width: number, height: number, style: FrameStyle = "single") {
    this.ctx.strokeStyle = this.WHITE;
    this.ctx.lineWidth = 1;
    
    if (style === "none") return;
    
    if (style === "double") {
      // Outer frame
      this.ctx.strokeRect(x, y, width, height);
      // Inner frame
      this.ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    } else if (style === "rounded") {
      // Simple rounded corners with lines
      const corner = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x + corner, y);
      this.ctx.lineTo(x + width - corner, y);
      this.ctx.lineTo(x + width, y + corner);
      this.ctx.lineTo(x + width, y + height - corner);
      this.ctx.lineTo(x + width - corner, y + height);
      this.ctx.lineTo(x + corner, y + height);
      this.ctx.lineTo(x, y + height - corner);
      this.ctx.lineTo(x, y + corner);
      this.ctx.closePath();
      this.ctx.stroke();
    } else {
      // Single frame
      this.ctx.strokeRect(x, y, width, height);
    }
  }
  
  private drawSlot(x: number, y: number, width: number, height: number, content?: SlotContent, label?: string) {
    // Draw slot background with dithering
    this.drawDitheredRect(x, y, width, height, 0.15);
    
    // Draw slot border
    this.ctx.strokeStyle = this.WHITE;
    this.ctx.strokeRect(x, y, width, height);
    
    // Draw content
    if (content) {
      switch (content.type) {
        case "sprite":
          if (content.sprite) {
            // Center sprite in slot
            const spriteSize = 8; // Assuming 8x8 sprites
            const centerX = x + (width - spriteSize) / 2;
            const centerY = y + (height - spriteSize) / 2;
            
            const frameX = (content.frame || 0) * spriteSize;
            this.ctx.drawImage(
              content.sprite,
              frameX, 0, spriteSize, spriteSize,
              centerX, centerY, spriteSize, spriteSize
            );
          }
          break;
          
        case "text":
          this.drawText(x + width / 2, y + height / 2 - 4, content.text, "center");
          break;
      }
    }
    
    // Draw label if present
    if (label) {
      this.drawText(x + 2, y + height - 2, label, "left");
    }
  }
  
  private drawText(x: number, y: number, text: string, align: "left" | "center" | "right" = "left", scale: number = 1) {
    if (!this.fontAtlas || !this.fontAtlas.drawTinyText) {
      // Fallback if font atlas not available
      this.ctx.fillStyle = this.WHITE;
      this.ctx.font = "8px monospace";
      this.ctx.textAlign = align as CanvasTextAlign;
      this.ctx.fillText(text, x, y);
      return;
    }
    
    // Calculate text offset for alignment
    let offsetX = x;
    const charWidth = 6 * scale;
    if (align === "center") {
      const textWidth = text.length * charWidth;
      offsetX = x - textWidth / 2;
    } else if (align === "right") {
      const textWidth = text.length * charWidth;
      offsetX = x - textWidth;
    }
    
    this.fontAtlas.drawTinyText(text, offsetX, y, this.WHITE, scale);
  }
  
  private drawProse(x: number, y: number, width: number, text: string, lineHeight: number = 10) {
    // Word wrap prose text
    const words = text.split(' ');
    const charWidth = 6;
    const maxCharsPerLine = Math.floor(width / charWidth);
    
    let currentLine = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length > maxCharsPerLine) {
        // Draw current line and start new one
        if (currentLine) {
          this.drawText(x, currentY, currentLine, "left");
          currentY += lineHeight;
          currentLine = word;
        } else {
          // Word is too long, break it
          this.drawText(x, currentY, word.substring(0, maxCharsPerLine), "left");
          currentY += lineHeight;
          currentLine = word.substring(maxCharsPerLine);
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Draw remaining line
    if (currentLine) {
      this.drawText(x, currentY, currentLine, "left");
    }
  }
  
  private drawGraph(x: number, y: number, width: number, height: number, data: number[], min?: number, max?: number) {
    // Draw axes with dithering
    for (let i = 0; i < height; i += 2) {
      this.ctx.fillStyle = this.WHITE;
      this.ctx.fillRect(x, y + i, 1, 1);
    }
    for (let i = 0; i < width; i += 2) {
      this.ctx.fillStyle = this.WHITE;
      this.ctx.fillRect(x + i, y + height, 1, 1);
    }
    
    if (data.length === 0) return;
    
    // Calculate min/max if not provided
    const dataMin = min ?? Math.min(...data);
    const dataMax = max ?? Math.max(...data);
    const range = dataMax - dataMin || 1;
    
    // Plot data
    this.ctx.strokeStyle = this.WHITE;
    this.ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const px = x + (i / (data.length - 1)) * width;
      const normalized = (data[i] - dataMin) / range;
      const py = y + height - (normalized * height);
      
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
      
      // Draw point
      this.ctx.fillStyle = this.WHITE;
      this.ctx.fillRect(px - 1, py - 1, 2, 2);
    }
    
    this.ctx.stroke();
  }
  
  private drawSprite(x: number, y: number, sprite: HTMLImageElement, frame: number = 0, scale: number = 1) {
    if (!sprite || !sprite.complete) return;
    
    const frameWidth = 16; // Assuming 16x16 sprites
    const sourceX = frame * frameWidth;
    
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      sprite,
      sourceX, 0, frameWidth, 16,
      x, y, frameWidth * scale, 16 * scale
    );
  }
  
  private drawDitheredRect(x: number, y: number, width: number, height: number, density: number) {
    // Simple alternating pixel dithering
    this.ctx.fillStyle = this.WHITE;
    
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        // Checkerboard pattern based on density
        const shouldDraw = (px + py) % 2 === 0;
        if (shouldDraw && Math.random() < density) {
          this.ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    }
  }
  
  // Helper to create common UI layouts
  static createInventoryLayout(rigData: any[]): UIElement[] {
    const elements: UIElement[] = [];
    
    // Main frame
    elements.push({
      type: "frame",
      x: 10,
      y: 10,
      width: 300,
      height: 180,
      style: "double",
      children: [
        // Title
        { type: "text", x: 150, y: 10, text: "HERO RIG", align: "center" },
        
        // Slots grid
        ...rigData.map((part, i) => ({
          type: "slot" as const,
          x: 20 + (i % 4) * 70,
          y: 30 + Math.floor(i / 4) * 40,
          width: 60,
          height: 30,
          content: part.sprite ? {
            type: "sprite" as const,
            sprite: part.sprite,
            frame: part.frame
          } : { type: "empty" as const },
          label: part.name
        }))
      ]
    });
    
    return elements;
  }
}