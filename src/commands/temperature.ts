import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * Temperature command - sets temperature at a position or globally
 * Params:
 *   x?: number - X position (if not provided, sets globally)
 *   y?: number - Y position (if not provided, sets globally)
 *   amount?: number - Temperature value or change
 *   radius?: number - Radius of effect (default 3)
 */
export class Temperature extends Command {
  name = "temperature";
  description = "Set the temperature across the battlefield";
  usage = "temperature <degrees> - Set temperature in Celsius";

  execute(_unitId: string | null, params: CommandParams): void {
    const x = params.x as number | undefined;
    const y = params.y as number | undefined;
    const amount = (params.amount as number) ?? 20;
    const radius = (params.radius as number) ?? 3;

    if (typeof amount !== "number" || isNaN(amount)) {
      console.error("Invalid temperature value");
      return;
    }

    if (x !== undefined && y !== undefined) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius) {
            const px = Math.round(x + dx);
            const py = Math.round(y + dy);
            if (
              px >= 0 &&
              px < this.sim.fieldWidth &&
              py >= 0 &&
              py < this.sim.fieldHeight
            ) {
              const falloff = 1 - dist / radius;
              const tempChange = amount * falloff;
              const currentTemp = this.sim.temperatureField.get(px, py);
              this.sim.temperatureField.set(px, py, currentTemp + tempChange);
            }
          }
        }
      }
    } else {
      for (let fx = 0; fx < this.sim.fieldWidth; fx++) {
        for (let fy = 0; fy < this.sim.fieldHeight; fy++) {
          const variation = (Simulator.rng.random() - 0.5) * 4; // ±2°C variation
          const finalTemp = amount + variation;

          this.sim.temperatureField.set(fx, fy, finalTemp);
        }
      }
    }
  }
}
