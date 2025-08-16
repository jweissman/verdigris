// @ts-ignore
import largeFont from "../assets/stenciled-16x16.png";
// @ts-ignore
import tinyFont from "../assets/teeny-4x4.png";
import { TextReviewer } from "../mwe/TextReviewer";

export default class FontAtlas {
  private ctx: CanvasRenderingContext2D;
  private largeFontImage: HTMLImageElement | null = null;
  private tinyFontImage: HTMLImageElement | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.loadFonts();
  }

  get fontsReady(): boolean {
    return !!(
      this.largeFontImage?.complete &&
      this.tinyFontImage?.complete &&
      this.largeFontImage.naturalWidth > 0 &&
      this.tinyFontImage.naturalWidth > 0
    );
  }

  private loadFonts() {
    this.largeFontImage = new Image();
    this.largeFontImage.src = largeFont;
    this.largeFontImage.onload = () => {
      console.debug(
        `Large font loaded: ${this.largeFontImage!.width}x${this.largeFontImage!.height}`,
      );
    };
    this.largeFontImage.onerror = (e) => {
      console.error("Failed to load large font:", e);
    };

    this.tinyFontImage = new Image();
    this.tinyFontImage.src = tinyFont;
    this.tinyFontImage.onload = () => {
      console.debug(
        `Tiny font loaded: ${this.tinyFontImage!.width}x${this.tinyFontImage!.height}`,
      );
    };
    this.tinyFontImage.onerror = (e) => {
      console.error("Failed to load tiny font:", e);
    };
  }

  drawTinyText(
    text: string,
    x: number,
    y: number,
    color: string = "#FFFFFF",
    scale: number = 1,
  ) {
    if (
      !this.tinyFontImage?.complete ||
      this.tinyFontImage.naturalWidth === 0
    ) {
      console.warn("Tiny font not ready");
      return;
    }

    this.drawAtlasText(text, x, y, color, scale, 4, 4, this.tinyFontImage, 12);
  }

  drawLargeText(
    text: string,
    x: number,
    y: number,
    color: string = "#FFFFFF",
    scale: number = 1,
  ) {
    if (
      !this.largeFontImage?.complete ||
      this.largeFontImage.naturalWidth === 0
    ) {
      console.warn("Large font not ready");
      return;
    }

    this.drawAtlasText(
      text,
      x,
      y,
      color,
      scale,
      16,
      16,
      this.largeFontImage,
      4,
    );
  }

  private drawAtlasText(
    text: string,
    x: number,
    y: number,
    _color: string,
    scale: number,
    charWidth: number,
    charHeight: number,
    font: HTMLImageElement,
    charsPerRow: number,
  ) {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i].toUpperCase();
      let atlasIndex = -1;

      if (char >= "A" && char <= "Z") {
        atlasIndex = char.charCodeAt(0) - "A".charCodeAt(0);
      } else if (char >= "0" && char <= "9") {
        atlasIndex = 26 + (char.charCodeAt(0) - "0".charCodeAt(0));
      } else if (char === " ") {
        currentX += charWidth * scale;
        continue;
      } else {
        currentX += charWidth * scale * 0.5;
        continue;
      }

      const atlasX = (atlasIndex % charsPerRow) * charWidth;
      const atlasY = Math.floor(atlasIndex / charsPerRow) * charHeight;

      this.ctx.drawImage(
        font,
        atlasX,
        atlasY,
        charWidth,
        charHeight,
        currentX,
        y,
        charWidth * scale,
        charHeight * scale,
      );

      currentX += charWidth * scale;
    }

    this.ctx.restore();
  }

  drawSpeechBubble(
    text: string,
    x: number,
    y: number,
    useTiny: boolean = true,
  ) {
    const charWidth = useTiny ? 4 : 16;
    const scale = useTiny ? 2 : 1;
    const bubbleWidth = text.length * charWidth * scale + 8;
    const bubbleHeight = charWidth * scale + 8;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.lineWidth = 1;

    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 10;

    this.ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);
    this.ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);

    this.ctx.beginPath();
    this.ctx.moveTo(x - 4, y - 10);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x + 4, y - 10);
    this.ctx.fill();

    const textX = x - (text.length * charWidth * scale) / 2;
    const textY = bubbleY + 2;

    if (useTiny) {
      this.drawTinyText(text, textX, textY, "#FFFFFF", scale);
    } else {
      this.drawLargeText(text, textX, textY, "#FFFFFF", scale);
    }

    this.ctx.restore();
  }
}
