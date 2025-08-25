import FontAtlas from "../core/font_atlas";
import type { Simulator } from "../core/simulator";

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

  constructor(sim: Simulator, ctx: CanvasRenderingContext2D, width: number, height: number, sprites?: Map<string, HTMLImageElement>) {
    this.sim = sim;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.sprites = sprites || new Map();
    this.fontAtlas = new FontAtlas(ctx);
  }

  render(): void {
    // Clear with dark background
    this.ctx.fillStyle = "#1a1a1a";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Find hero unit
    const hero = this.sim.units.find(u => u.tags?.includes("hero"));
    if (!hero) {
      if (this.fontAtlas.fontsReady) {
        this.fontAtlas.drawTinyText("No hero found", 10, 10, "#FFFFFF", 2);
      }
      return;
    }

    // Title
    if (this.fontAtlas.fontsReady) {
      this.fontAtlas.drawTinyText("Hero Rig", 10, 10, "#FFFFFF", 2);
    }

    // Show hero sprite for debugging
    const heroSprite = this.sprites.get("hero");
    if (heroSprite && heroSprite.complete) {
      // Draw hero sprite at larger scale
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(
        heroSprite,
        0, 0, 16, 16,  // source
        50, 50, 64, 64  // destination - 4x scale
      );
    }
    
    // Show hero rig parts if available
    if (hero.meta?.rig) {
      const rig = hero.meta.rig;
      
      // Draw assembled hero on the left (rigid view)
      this.drawRigidHero(rig, 60, 80);
      
      // Draw individual parts on the right
      let y = 30;
      const x = 140;
      const boxSize = 20;
      const padding = 4;

      // Using font atlas instead
      
      // Draw each part - arrange in 3x3 grid
      const parts = ['head', 'torso', 'larm', 'rarm', 'lleg', 'rleg', 'sword'];
      
      parts.forEach((partName, index) => {
        const part = rig[partName];
        if (part) {
          const row = Math.floor(index / 3);
          const col = index % 3;
          const px = x + col * (boxSize + padding);
          const py = y + row * (boxSize + padding + 15);

          // Background box
          this.ctx.fillStyle = "#333";
          this.ctx.fillRect(px, py, boxSize, boxSize);

          // Draw the actual sprite part
          // Hero parts are stored in the hero sprite sheet
          const heroSprite = this.sprites.get("hero");
          if (heroSprite && heroSprite.complete) {
            const frame = part.frame || 0;
            const frameWidth = 16;
            const sourceX = frame * frameWidth;
            
            // For now just draw the first frame of hero sprite
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(
              heroSprite,
              sourceX, 0, frameWidth, 16,
              px + 2, py + 2, boxSize - 4, boxSize - 4
            );
          } else {
            // Fallback: draw colored rectangle
            this.ctx.fillStyle = "#666";
            this.ctx.fillRect(px + 4, py + 4, boxSize - 8, boxSize - 8);
          }

          // Part label
          if (this.fontAtlas.fontsReady) {
            this.fontAtlas.drawTinyText(partName, px, py - 5, "#FFFFFF", 1);
          }

          // Part details
          if (part.offset && this.fontAtlas.fontsReady) {
            const offsetText = `x:${part.offset.x.toFixed(1)} y:${part.offset.y.toFixed(1)}`;
            this.fontAtlas.drawTinyText(offsetText, px, py + boxSize + 12, "#888", 1.5);
            if (part.rotation !== undefined) {
              this.fontAtlas.drawTinyText(`rot:${part.rotation.toFixed(2)}`, px, py + boxSize + 22, "#888", 1.5);
            }
          }
        }
      });
    }

    // Show hero stats  
    const statsY = 140;
    if (this.fontAtlas.fontsReady) {
      this.fontAtlas.drawTinyText(`HP: ${hero.hp}/${hero.maxHp}`, 10, statsY, "#FFFFFF", 2);
      this.fontAtlas.drawTinyText(`State: ${hero.state}`, 10, statsY + 12, "#FFFFFF", 2);
      this.fontAtlas.drawTinyText(`Facing: ${hero.meta?.facing || 'unknown'}`, 10, statsY + 24, "#FFFFFF", 2);
    }
    
    // Show position for debugging interpolation
    if (this.fontAtlas.fontsReady) {
      this.fontAtlas.drawTinyText(`Pos: ${hero.pos.x.toFixed(1)},${hero.pos.y.toFixed(1)}`, 10, statsY + 36, "#FFFFFF", 2);
      if (hero.intendedMove) {
        this.fontAtlas.drawTinyText(`Move: ${hero.intendedMove.x},${hero.intendedMove.y}`, 10, statsY + 48, "#FFFFFF", 2);
      }
    }
  }
  
  private drawRigidHero(rig: any, centerX: number, centerY: number): void {
    // Draw a "rigid" version of the hero with all parts assembled
    const scale = 2; // Smaller scale for 320x200
    
    // All hero parts use the "hero" sprite sheet
    const heroSprite = this.sprites.get("hero");
    if (!heroSprite || !heroSprite.complete) {
      // Fallback - draw placeholder
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.fillRect(centerX - 16, centerY - 16, 32, 32);
      return;
    }
    
    // Draw each part at its offset position
    const drawPart = (partName: string, baseX: number, baseY: number) => {
      const part = rig[partName];
      if (!part) return;
      
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
      
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(
        heroSprite, // Use hero sprite for all parts
        sourceX, 0, frameWidth, 16,
        -frameWidth * scale / 2, -16 * scale / 2, 
        frameWidth * scale, 16 * scale
      );
      
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