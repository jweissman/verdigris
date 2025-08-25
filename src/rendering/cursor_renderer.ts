export class CursorRenderer {
  private hoverPos: { x: number; y: number } | null = null;
  private clickPos: { x: number; y: number } | null = null;
  private clickTime: number = 0;

  setHoverPosition(x: number, y: number) {
    this.hoverPos = { x, y };
  }

  clearHoverPosition() {
    this.hoverPos = null;
  }

  setClickPosition(x: number, y: number) {
    this.clickPos = { x, y };
    this.clickTime = Date.now();
  }

  render(
    ctx: CanvasRenderingContext2D,
    toIsometric: (x: number, y: number) => { x: number; y: number },
  ) {
    if (this.hoverPos) {
      const screen = toIsometric(this.hoverPos.x, this.hoverPos.y);

      ctx.save();
      ctx.strokeStyle = "#ffffff80";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(screen.x, screen.y - 4);
      ctx.lineTo(screen.x + 8, screen.y);
      ctx.lineTo(screen.x, screen.y + 4);
      ctx.lineTo(screen.x - 8, screen.y);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }

    if (this.clickPos) {
      const elapsed = Date.now() - this.clickTime;
      if (elapsed < 500) {
        const screen = toIsometric(this.clickPos.x, this.clickPos.y);
        const opacity = 1 - elapsed / 500;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 2;

        const radius = 4 + elapsed / 50;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      } else {
        this.clickPos = null;
      }
    }
  }
}
