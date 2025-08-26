export type UIElement = 
  | { type: "container"; x: number; y: number; width: number; height: number; padding?: number; children: UIElement[] }
  | { type: "frame"; x: number; y: number; width: number; height: number; style?: FrameStyle; children?: UIElement[] }
  | { type: "slot"; x: number; y: number; width: number; height: number; content?: SlotContent; label?: string }
  | { type: "button"; x: number; y: number; width: number; height: number; text: string; pressed?: boolean }
  | { type: "progress"; x: number; y: number; width: number; height: number; value: number; max: number }
  | { type: "menu"; x: number; y: number; width: number; items: string[]; selected?: number }
  | { type: "text"; x: number; y: number; text: string; align?: "left" | "center" | "right"; scale?: number }
  | { type: "prose"; x: number; y: number; width: number; text: string; lineHeight?: number }
  | { type: "graph"; x: number; y: number; width: number; height: number; data: number[]; min?: number; max?: number }
  | { type: "dithered_rect"; x: number; y: number; width: number; height: number; density?: number }
  | { type: "sprite"; x: number; y: number; sprite: HTMLImageElement; frame?: number; scale?: number }
  | { type: "hbox"; x: number; y: number; width: number; height: number; spacing?: number; children: UIElement[] }
  | { type: "vbox"; x: number; y: number; width: number; height: number; spacing?: number; children: UIElement[] };

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
      case "container":
        const padding = element.padding || 0;
        if (element.children) {
          for (const child of element.children) {
            const offsetChild = this.offsetElement(child, element.x + padding, element.y + padding);
            this.renderElement(offsetChild);
          }
        }
        break;
        
      case "hbox":
        this.layoutHorizontal(element);
        break;
        
      case "vbox":
        this.layoutVertical(element);
        break;
        
      case "frame":
        this.drawFrame(element.x, element.y, element.width, element.height, element.style);
        if (element.children) {
          for (const child of element.children) {
            const offsetChild = this.offsetElement(child, element.x, element.y);
            this.renderElement(offsetChild);
          }
        }
        break;
        
      case "button":
        this.drawButton(element.x, element.y, element.width, element.height, element.text, element.pressed);
        break;
        
      case "progress":
        this.drawProgress(element.x, element.y, element.width, element.height, element.value, element.max);
        break;
        
      case "menu":
        this.drawMenu(element.x, element.y, element.width, element.items, element.selected);
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
    return { ...element, x: element.x + offsetX, y: element.y + offsetY } as UIElement;
  }
  
  private layoutHorizontal(element: UIElement & { type: "hbox" }) {
    const spacing = element.spacing || 2;
    let currentX = element.x;
    
    for (const child of element.children) {
      const offsetChild = { ...child, x: currentX, y: element.y } as UIElement;
      this.renderElement(offsetChild);
      currentX += this.getElementWidth(child) + spacing;
    }
  }
  
  private layoutVertical(element: UIElement & { type: "vbox" }) {
    const spacing = element.spacing || 2;
    let currentY = element.y;
    
    for (const child of element.children) {
      const offsetChild = { ...child, x: element.x, y: currentY } as UIElement;
      this.renderElement(offsetChild);
      currentY += this.getElementHeight(child) + spacing;
    }
  }
  
  private getElementWidth(element: UIElement): number {
    if ('width' in element) return element.width;
    if (element.type === 'text') return (element.text.length * 6 * (element.scale || 1));
    return 0;
  }
  
  private getElementHeight(element: UIElement): number {
    if ('height' in element) return element.height;
    if (element.type === 'text') return 8 * (element.scale || 1);
    if (element.type === 'menu') return element.items.length * 10;
    return 0;
  }
  
  private drawFrame(x: number, y: number, width: number, height: number, style: FrameStyle = "single") {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.strokeStyle = this.WHITE;
    this.ctx.lineWidth = 1;
    
    if (style === "none") return;
    
    if (style === "double") {
      // Outer frame with fillRect
      this.ctx.fillStyle = this.WHITE;
      this.ctx.fillRect(x, y, width, 1);
      this.ctx.fillRect(x, y + height - 1, width, 1);
      this.ctx.fillRect(x, y, 1, height);
      this.ctx.fillRect(x + width - 1, y, 1, height);
      // Inner frame
      this.ctx.fillRect(x + 2, y + 2, width - 4, 1);
      this.ctx.fillRect(x + 2, y + height - 3, width - 4, 1);
      this.ctx.fillRect(x + 2, y + 2, 1, height - 4);
      this.ctx.fillRect(x + width - 3, y + 2, 1, height - 4);
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
      // Single frame with fillRect
      this.ctx.fillStyle = this.WHITE;
      this.ctx.fillRect(x, y, width, 1);
      this.ctx.fillRect(x, y + height - 1, width, 1);
      this.ctx.fillRect(x, y, 1, height);
      this.ctx.fillRect(x + width - 1, y, 1, height);
    }
  }
  
  private drawButton(x: number, y: number, width: number, height: number, text: string, pressed?: boolean) {
    // Draw button frame with fillRect
    this.ctx.fillStyle = this.WHITE;
    this.ctx.fillRect(x, y, width, 1);
    this.ctx.fillRect(x, y + height - 1, width, 1);
    this.ctx.fillRect(x, y, 1, height);
    this.ctx.fillRect(x + width - 1, y, 1, height);
    
    if (pressed) {
      // Inverted dithering for pressed state
      this.ctx.fillStyle = this.WHITE;
      for (let py = 1; py < height - 1; py++) {
        for (let px = 1; px < width - 1; px++) {
          if ((px + py) % 2 === 1) { // Inverse pattern
            this.ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
      }
    } else {
      // Normal button - light dithering
      this.ctx.fillStyle = this.WHITE;
      // Shadow effect with dithering
      for (let i = 1; i < height - 1; i += 2) {
        this.ctx.fillRect(x + width - 1, y + i, 1, 1);
      }
      for (let i = 1; i < width - 1; i += 2) {
        this.ctx.fillRect(x + i, y + height - 1, 1, 1);
      }
    }
    
    // Draw button text centered
    const textColor = pressed ? this.WHITE : this.WHITE;
    if (this.fontAtlas && this.fontAtlas.drawTinyText) {
      const textX = x + width / 2;
      const textY = y + height / 2 - 4;
      this.fontAtlas.drawTinyText(text, textX - (text.length * 3), textY, textColor, 1);
    }
  }
  
  private drawProgress(x: number, y: number, width: number, height: number, value: number, max: number) {
    // Draw border with fillRect
    this.ctx.fillStyle = this.WHITE;
    this.ctx.fillRect(x, y, width, 1);
    this.ctx.fillRect(x, y + height - 1, width, 1);
    this.ctx.fillRect(x, y, 1, height);
    this.ctx.fillRect(x + width - 1, y, 1, height);
    
    // Draw filled portion
    const fillWidth = Math.floor((value / max) * (width - 2));
    if (fillWidth > 0) {
      // Dithered fill for progress
      for (let py = 1; py < height - 1; py++) {
        for (let px = 1; px <= fillWidth; px++) {
          if ((px + py) % 2 === 0) {
            this.ctx.fillStyle = this.WHITE;
            this.ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
      }
    }
    
    // Draw percentage text
    const percent = Math.floor((value / max) * 100);
    if (this.fontAtlas && this.fontAtlas.drawTinyText) {
      const text = `${percent}%`;
      this.fontAtlas.drawTinyText(text, x + width + 4, y + height / 2 - 4, this.WHITE, 0.8);
    }
  }
  
  private drawMenu(x: number, y: number, width: number, items: string[], selected?: number) {
    const itemHeight = 10;
    const height = items.length * itemHeight;
    
    // Draw menu frame with fillRect
    this.ctx.fillStyle = this.WHITE;
    this.ctx.fillRect(x, y, width, 1);
    this.ctx.fillRect(x, y + height - 1, width, 1);
    this.ctx.fillRect(x, y, 1, height);
    this.ctx.fillRect(x + width - 1, y, 1, height);
    
    // Draw items
    items.forEach((item, index) => {
      const itemY = y + index * itemHeight;
      
      // Highlight selected item with dithering
      if (index === selected) {
        this.ctx.fillStyle = this.WHITE;
        // Dithered selection bar
        for (let py = 0; py < itemHeight - 1; py++) {
          for (let px = 1; px < width - 1; px++) {
            if ((px + py + itemY) % 2 === 0) {
              this.ctx.fillRect(x + px, itemY + py + 1, 1, 1);
            }
          }
        }
      }
      
      // Draw text for all items
      if (this.fontAtlas && this.fontAtlas.drawTinyText) {
        this.fontAtlas.drawTinyText(item, x + 4, itemY + 2, this.WHITE, 1);
      }
    });
  }
  
  private drawSlot(x: number, y: number, width: number, height: number, content?: SlotContent, label?: string) {
    // Draw slot border with pixel-perfect lines
    this.ctx.fillStyle = this.WHITE;
    // Top border
    this.ctx.fillRect(x, y, width, 1);
    // Bottom border  
    this.ctx.fillRect(x, y + height - 1, width, 1);
    // Left border
    this.ctx.fillRect(x, y, 1, height);
    // Right border
    this.ctx.fillRect(x + width - 1, y, 1, height);
    
    // Fill background with black first
    this.ctx.fillStyle = this.BLACK;
    this.ctx.fillRect(x + 1, y + 1, width - 2, height - 2);
    
    // Light dithering only if empty
    if (!content || content.type === "empty") {
      // Very light dithering for empty slots
      this.ctx.fillStyle = this.WHITE;
      for (let py = 2; py < height - 2; py += 3) {
        for (let px = 2; px < width - 2; px += 3) {
          this.ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    }
    
    // Draw content
    if (content && content.type !== "empty") {
      switch (content.type) {
        case "sprite":
          if (content.sprite && content.sprite.complete) {
            // Sprites are 16x16, not 8x8
            const spriteSize = 16;
            const frameX = (content.frame || 0) * spriteSize;
            
            // Scale to fit in slot with some padding
            const scale = Math.min((width - 4) / spriteSize, (height - 4) / spriteSize);
            const drawSize = spriteSize * scale;
            const centerX = x + (width - drawSize) / 2;
            const centerY = y + (height - drawSize) / 2;
            
            this.ctx.imageSmoothingEnabled = false;
            // Force proper 1-bit rendering
            this.ctx.globalCompositeOperation = "source-over";
            this.ctx.drawImage(
              content.sprite,
              frameX, 0, spriteSize, spriteSize,
              centerX, centerY, drawSize, drawSize
            );
          }
          break;
          
        case "text":
          this.drawText(x + width / 2, y + height / 2 - 4, content.text, "center");
          break;
      }
    }
    
    // Draw label at bottom if present
    if (label) {
      // Small text at bottom
      if (this.fontAtlas && this.fontAtlas.drawTinyText) {
        this.fontAtlas.drawTinyText(label, x + 2, y + height - 8, this.WHITE, 0.8);
      }
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
    // Proper 1-bit checkerboard dithering
    this.ctx.fillStyle = this.WHITE;
    
    // Simple checkerboard: draw on even x+y positions for 50% density
    // For other densities, use different patterns
    if (density <= 0.25) {
      // 25% - every other row, every other column
      for (let py = 0; py < height; py += 2) {
        for (let px = 0; px < width; px += 2) {
          this.ctx.fillRect(x + px, y + py, 1, 1);
        }
      }
    } else if (density <= 0.5) {
      // 50% - classic checkerboard
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          if ((px + py) % 2 === 0) {
            this.ctx.fillRect(x + px, y + py, 1, 1);
          }
        }
      }
    } else {
      // 75% - inverse checkerboard (more white)
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          if ((px + py) % 2 === 0 || (px % 2 === 0 && py % 2 === 0)) {
            this.ctx.fillRect(x + px, y + py, 1, 1);
          }
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
  
  static createDialog(title: string, message: string, buttons: string[] = ["OK"]): UIElement[] {
    const width = Math.max(200, message.length * 6 + 20);
    const height = 80;
    const x = 160 - width / 2;
    const y = 100 - height / 2;
    
    return [{
      type: "frame",
      x, y, width, height,
      style: "double",
      children: [
        { type: "text", x: width / 2, y: 10, text: title, align: "center", scale: 1.5 },
        { type: "prose", x: 10, y: 30, width: width - 20, text: message },
        { 
          type: "hbox", 
          x: 10, 
          y: height - 25,
          width: width - 20,
          height: 20,
          spacing: 5,
          children: buttons.map(btn => ({
            type: "button" as const,
            x: 0, y: 0,
            width: 50,
            height: 15,
            text: btn,
            pressed: false
          }))
        }
      ]
    }];
  }
  
  static createHUD(hp: number, maxHp: number, mana: number, maxMana: number): UIElement[] {
    return [{
      type: "vbox",
      x: 5,
      y: 5,
      width: 100,
      height: 40,
      spacing: 2,
      children: [
        { type: "progress", x: 0, y: 0, width: 80, height: 8, value: hp, max: maxHp },
        { type: "progress", x: 0, y: 0, width: 80, height: 8, value: mana, max: maxMana }
      ]
    }];
  }
}