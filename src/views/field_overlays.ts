import type { Simulator } from "../core/simulator";

export class FieldOverlays {
  private ctx: CanvasRenderingContext2D;
  private sim: Simulator;

  constructor(ctx: CanvasRenderingContext2D, sim: Simulator) {
    this.ctx = ctx;
    this.sim = sim;
  }

  /**
   * Render temperature field as colored overlay
   */
  renderTemperatureField(
    toScreenCoords: (x: number, y: number) => { x: number; y: number },
  ) {
    if (!this.sim.temperatureField) return;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3; // Semi-transparent overlay

    for (let x = 0; x < this.sim.fieldWidth; x++) {
      for (let y = 0; y < this.sim.fieldHeight; y++) {
        const temp = this.sim.temperatureField.get(x, y);
        const { x: screenX, y: screenY } = toScreenCoords(x, y);

        let color = "#444444"; // Default neutral
        if (temp < -5) {
          color = "#0088FF";
        } else if (temp < 0) {
          color = "#44AAFF";
        } else if (temp > 25) {
          color = "#FF4444";
        } else if (temp > 15) {
          color = "#FF8844";
        } else if (temp > 5) {
          color = "#44AA44";
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenX - 4, screenY - 4, 8, 8);
      }
    }

    this.ctx.restore();
  }

  /**
   * Render humidity field as subtle dots
   */
  renderHumidityField(
    toScreenCoords: (x: number, y: number) => { x: number; y: number },
  ) {
    if (!this.sim.humidityField) return;

    this.ctx.save();
    this.ctx.globalAlpha = 0.4;

    for (let x = 0; x < this.sim.fieldWidth; x++) {
      for (let y = 0; y < this.sim.fieldHeight; y++) {
        const humidity = this.sim.humidityField.get(x, y);
        if (humidity > 0.5) {
          const { x: screenX, y: screenY } = toScreenCoords(x, y);

          const radius = Math.max(1, humidity * 3);
          const alpha = Math.min(0.6, humidity);

          this.ctx.globalAlpha = alpha;
          this.ctx.fillStyle = "#4488AA"; // Water blue
          this.ctx.beginPath();
          this.ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
          this.ctx.fill();
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * Render lightning strike zones as electrical fields
   */
  renderLightningField(
    toScreenCoords: (x: number, y: number) => { x: number; y: number },
  ) {
    const recentStrikes =
      this.sim.getProcessedEvents()?.filter(
        (event) =>
          event.kind === "aoe" &&
          event.meta.aspect === "emp" &&
          event.meta.tick &&
          this.sim.ticks - event.meta.tick < 30, // 30 tick fade time
      ) || [];

    this.ctx.save();

    for (const strike of recentStrikes) {
      if (typeof strike.target !== "object" || !("x" in strike.target))
        continue;

      const pos = strike.target as { x: number; y: number };
      const age = strike.tick ? this.sim.ticks - strike.tick : 0;
      const fadeRatio = Math.max(0, 1 - age / 30);

      const { x: centerX, y: centerY } = toScreenCoords(pos.x, pos.y);
      const radius = (strike.meta.radius || 3) * 8;

      this.ctx.globalAlpha = fadeRatio * 0.2;

      this.ctx.strokeStyle = "#00AAFF";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();

      this.ctx.globalAlpha = fadeRatio * 0.4;
      this.ctx.fillStyle = "#AAFFFF";
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const sparkX = centerX + Math.cos(angle) * radius * 0.7;
        const sparkY = centerY + Math.sin(angle) * radius * 0.7;
        this.ctx.beginPath();
        this.ctx.arc(sparkX, sparkY, 2, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  /**
   * Render all environmental overlays
   */
  renderAll(
    toScreenCoords: (x: number, y: number) => { x: number; y: number },
  ) {
    this.renderTemperatureField(toScreenCoords);
    this.renderHumidityField(toScreenCoords);
    this.renderLightningField(toScreenCoords);

    this.renderLegend();
  }

  private renderLegend() {
    this.ctx.save();
    this.ctx.globalAlpha = 0.8;

    const legendX = 10;
    const legendY = this.ctx.canvas.height - 95; // 95px from bottom (80px legend + 15px margin)

    this.ctx.fillStyle = "#000000AA";
    this.ctx.fillRect(legendX, legendY, 120, 80);

    this.ctx.font = "10px monospace";
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Field Overlays:", legendX + 5, legendY + 15);

    this.ctx.fillStyle = "#0088FF";
    this.ctx.fillRect(legendX + 5, legendY + 20, 8, 8);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Cold", legendX + 18, legendY + 27);

    this.ctx.fillStyle = "#FF4444";
    this.ctx.fillRect(legendX + 5, legendY + 32, 8, 8);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Hot", legendX + 18, legendY + 39);

    this.ctx.fillStyle = "#4488AA";
    this.ctx.beginPath();
    this.ctx.arc(legendX + 9, legendY + 48, 3, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Humidity", legendX + 18, legendY + 51);

    this.ctx.strokeStyle = "#00AAFF";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(legendX + 9, legendY + 64, 4, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Lightning", legendX + 18, legendY + 67);

    this.ctx.restore();
  }
}
