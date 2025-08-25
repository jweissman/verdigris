import FontAtlas from "../core/font_atlas";
import type { Simulator } from "../core/simulator";
import { UXRenderer, UIElement } from "../core/ux_renderer";

/**
 * Inventory view for debugging hero rig components
 */
export class InventoryView {
  private sim: Simulator;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private sprites: Map<string, HTMLImageElement>;
  private fontAtlas: FontAtlas;
  private uxRenderer: UXRenderer;

  constructor(sim: Simulator, ctx: CanvasRenderingContext2D, width: number, height: number, sprites?: Map<string, HTMLImageElement>) {
    this.sim = sim;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.sprites = sprites || new Map();
    this.fontAtlas = new FontAtlas(ctx);
    this.uxRenderer = new UXRenderer(ctx, this.fontAtlas);
  }

  render(): void {
    // Clear with black background for monochrome theme
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Find hero unit
    const hero = this.sim.units.find(u => u.tags?.includes("hero"));
    if (!hero) {
      const elements: UIElement[] = [
        { type: "text", x: 160, y: 100, text: "NO HERO FOUND", align: "center", scale: 2 }
      ];
      this.uxRenderer.render(elements);
      return;
    }

    // Build UI elements
    const elements: UIElement[] = [];
    
    // Main frame with title
    elements.push({
      type: "frame",
      x: 5,
      y: 5,
      width: 310,
      height: 190,
      style: "double",
      children: [
        { type: "text", x: 155, y: 15, text: "HERO RIG", align: "center", scale: 2 }
      ]
    });
    
    // Always show the slot grid
    const parts = ['head', 'torso', 'larm', 'rarm', 'lleg', 'rleg', 'sword'];
    const x = 15;  
    const y = 35; 
    const boxSize = 30;
    const padding = 5;
    
    // Get or create rig data
    let rig = hero.meta?.rig || [
      { name: "head", sprite: "hero-head", frame: 0, offset: { x: 0, y: -8 } },
      { name: "torso", sprite: "hero-torso", frame: 0, offset: { x: 0, y: 0 } },
      { name: "larm", sprite: "hero-larm", frame: 0, offset: { x: -2, y: 0 } },
      { name: "rarm", sprite: "hero-rarm", frame: 0, offset: { x: 2, y: 0 } },
      { name: "lleg", sprite: "hero-lleg", frame: 0, offset: { x: -1, y: 6 } },
      { name: "rleg", sprite: "hero-rleg", frame: 0, offset: { x: 1, y: 6 } },
      { name: "sword", sprite: hero.meta?.weapon === "axe" ? "hero-axe" : "hero-sword", frame: 0, offset: { x: 4, y: -2 } }
    ];
    
    // Create slots for rig parts
    parts.forEach((partName, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const px = x + col * (boxSize + padding);
      const py = y + row * (boxSize + padding);
      
      // Find the part data
      const part = Array.isArray(rig) 
        ? rig.find(p => p.name === partName)
        : (rig as any)[partName];
      
      // Create slot element
      const slotElement: UIElement = {
        type: "slot",
        x: px,
        y: py,
        width: boxSize,
        height: boxSize,
        content: part?.sprite ? {
          type: "sprite",
          sprite: this.sprites.get(part.sprite)!,
          frame: part.frame || 0
        } : { type: "empty" },
        label: partName
      };
      
      elements.push(slotElement);
    });

    // Stats panel
    const statsY = 120;
    elements.push({
      type: "frame",
      x: 15,
      y: statsY,
      width: 140,
      height: 65,
      style: "single",
      children: [
        { type: "text", x: 5, y: 8, text: `HP: ${hero.hp}/${hero.maxHp}`, scale: 1 },
        { type: "text", x: 5, y: 18, text: `STATE: ${hero.state || 'idle'}`, scale: 1 },
        { type: "text", x: 5, y: 28, text: `FACING: ${hero.meta?.facing || 'unknown'}`, scale: 1 },
        { type: "text", x: 5, y: 38, text: `POS: ${hero.pos.x.toFixed(1)},${hero.pos.y.toFixed(1)}`, scale: 1 },
        { type: "text", x: 5, y: 48, text: hero.intendedMove ? `MOVE: ${hero.intendedMove.x},${hero.intendedMove.y}` : "MOVE: none", scale: 1 }
      ]
    });
    
    // HP graph
    const hpHistory = hero.meta?.hpHistory || [hero.hp];
    elements.push({
      type: "frame", 
      x: 165,
      y: statsY,
      width: 140,
      height: 65,
      style: "single",
      children: [
        { type: "text", x: 5, y: 8, text: "HP HISTORY", scale: 1 },
        { type: "graph", x: 10, y: 20, width: 120, height: 35, data: hpHistory, min: 0, max: hero.maxHp }
      ]
    });
    
    // Render all elements
    this.uxRenderer.render(elements);
  }
  
  private drawRigidHero(rig: any, centerX: number, centerY: number): void {
    // Draw a "rigid" version of the hero with all parts assembled
    const scale = 2; // Smaller scale for 320x200
    
    // Draw each part at its offset position
    const drawPart = (partName: string, baseX: number, baseY: number) => {
      const part = rig[partName];
      if (!part) return;
      
      // Get the specific sprite for this part
      const spriteName = part.sprite;
      const partSprite = spriteName ? this.sprites.get(spriteName) : null;
      
      if (!partSprite || !partSprite.complete) {
        // Fallback - draw colored box
        const colors: Record<string, string> = {
          head: "#FFB6C1",
          torso: "#87CEEB", 
          larm: "#98FB98",
          rarm: "#98FB98",
          lleg: "#DDA0DD",
          rleg: "#DDA0DD",
          sword: "#FFD700"
        };
        this.ctx.fillStyle = colors[partName] || "#666";
        const x = centerX + (baseX + (part.offset?.x || 0)) * scale;
        const y = centerY + (baseY + (part.offset?.y || 0)) * scale;
        this.ctx.fillRect(x - 8, y - 8, 16, 16);
        return;
      }
      
      const frame = part.frame || 0;
      const frameWidth = 16;
      const sourceX = frame * frameWidth;
      
      const x = centerX + (baseX + (part.offset?.x || 0)) * scale;
      const y = centerY + (baseY + (part.offset?.y || 0)) * scale;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      if (part.rotation) {
        this.ctx.rotate(part.rotation);
      }
      
      // Handle scale for parts (some might need to be hidden)
      const partScale = part.scale !== undefined ? part.scale : 1;
      
      if (partScale > 0) {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(
          partSprite,
          sourceX, 0, frameWidth, 16,
          -frameWidth * scale * partScale / 2, -16 * scale * partScale / 2, 
          frameWidth * scale * partScale, 16 * scale * partScale
        );
      }
      
      this.ctx.restore();
    };
    
    // Draw parts in order (back to front)
    drawPart('larm', -2, 0);
    drawPart('lleg', -1, 6);
    drawPart('rleg', 1, 6);
    drawPart('torso', 0, 0);
    drawPart('rarm', 2, 0);
    drawPart('head', 0, -8);
    drawPart('sword', 4, -2);
    
    // Label
    if (this.fontAtlas.fontsReady) {
      this.fontAtlas.drawTinyText("Assembled", centerX - 20, centerY + 40, "#FFFFFF", 2);
    }
  }
}