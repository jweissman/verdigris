import FontAtlas from "../core/font_atlas";

export class TextReviewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private charsetCanvas: HTMLCanvasElement;
  private charsetCtx: CanvasRenderingContext2D;
  private renderer: FontAtlas;

  constructor() {
    this.canvas = document.getElementById("fontCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.charsetCanvas = document.getElementById(
      "charsetCanvas",
    ) as HTMLCanvasElement;
    this.charsetCtx = this.charsetCanvas.getContext("2d")!;

    this.renderer = new FontAtlas(this.ctx);

    this.setupControls();
    this.animate();
  }

  setupControls() {
    document
      .getElementById("textInput")!
      .addEventListener("input", () => this.render());
    document
      .getElementById("fontSelect")!
      .addEventListener("change", () => this.render());
    document
      .getElementById("colorInput")!
      .addEventListener("input", () => this.render());
    document
      .getElementById("bubbleType")!
      .addEventListener("change", () => this.render());

    const scaleInput = document.getElementById(
      "scaleInput",
    )! as HTMLInputElement;
    scaleInput.addEventListener("input", (e) => {
      document.getElementById("scaleValue")!.textContent = (
        e.target as HTMLInputElement
      ).value;
      this.render();
    });
  }

  animate() {
    this.render();
    this.renderCharset();
    requestAnimationFrame(() => this.animate());
  }

  render() {
    this.ctx.fillStyle = "#111";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = "#333";
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

    const text = (document.getElementById("textInput") as HTMLInputElement)
      .value;
    const font = (document.getElementById("fontSelect") as HTMLSelectElement)
      .value as "tiny" | "large";
    const color = (document.getElementById("colorInput") as HTMLInputElement)
      .value;
    const scale = parseInt(
      (document.getElementById("scaleInput") as HTMLInputElement).value,
    );
    const bubbleType = (
      document.getElementById("bubbleType") as HTMLSelectElement
    ).value;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const textX =
      centerX - (text.length * (font === "tiny" ? 4 : 16) * scale) / 2;

    if (bubbleType === "speech") {
      this.renderer.drawSpeechBubble(text, centerX, centerY, font === "tiny");
    } else {
      if (font === "tiny") {
        this.renderer.drawTinyText(text, textX, centerY, color, scale);
      } else {
        this.renderer.drawLargeText(text, textX, centerY, color, scale);
      }
    }

    this.ctx.fillStyle = "#0F0";
    this.ctx.font = "10px monospace";
    this.ctx.fillText(`Text: "${text}" (${text.length} chars)`, 10, 20);
    this.ctx.fillText(`Font: ${font}, Scale: ${scale}x`, 10, 35);
    this.ctx.fillText(
      `Fonts Ready: ${this.renderer.fontsReady ? "YES" : "NO"}`,
      10,
      50,
    );
  }

  renderCharset() {
    this.charsetCtx.fillStyle = "#111";
    this.charsetCtx.fillRect(
      0,
      0,
      this.charsetCanvas.width,
      this.charsetCanvas.height,
    );

    const font = (document.getElementById("fontSelect") as HTMLSelectElement)
      .value as "tiny" | "large";
    const scale = 2;

    const charsetRenderer = new FontAtlas(this.charsetCtx);

    let x = 10;
    let y = 30;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      if (font === "tiny") {
        charsetRenderer.drawTinyText(char, x, y, "#FFF", scale);
        x += 12;
      } else {
        charsetRenderer.drawLargeText(char, x, y, "#FFF", scale);
        x += 20;
      }

      if (x > this.charsetCanvas.width - 40) {
        x = 10;
        y += font === "tiny" ? 20 : 40;
      }
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    (window as any).textReview = new TextReviewer();
  });
}
