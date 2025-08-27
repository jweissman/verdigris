import { Command, CommandParams } from "../rules/command";
import { Simulator } from "../core/simulator";

/**
 * ChangeWeather command - changes weather conditions
 * Params:
 *   weatherType: string - Type of weather (rain, snow, winter, clear, etc.)
 *   duration?: number - Duration in ticks (default 80)
 *   intensity?: number - Intensity 0-1 (default 0.8)
 */
export class ChangeWeather extends Command {
  execute(_unitId: string | null, params: CommandParams): void {
    const weatherType = params.weatherType as string;
    const duration = params.duration as number | undefined;
    const intensity = params.intensity as number | undefined;
    const durationValue = duration ?? 80; // Default 10 seconds at 8fps
    const intensityValue = intensity ?? 0.8;

    switch (weatherType) {
      case "rain":
        if (this.sim.setWeather) {
          this.sim.setWeather("rain", durationValue, intensityValue);
        }

        for (let i = 0; i < Math.min(durationValue, 100); i++) {
          this.sim.particleArrays.addParticle({
            id: `rain_${Date.now()}_${i}`,
            type: "rain",
            pos: {
              x: Simulator.rng.random() * this.sim.fieldWidth * 8,
              y: Simulator.rng.random() * 10,
            },
            vel: { x: 0, y: 1 + Simulator.rng.random() * 2 },
            radius: 1,
            color: "#4444FF",
            lifetime: 100,
          });
        }
        break;

      case "winter":
      case "snow":
        if (this.sim.temperatureField) {
          for (let x = 0; x < this.sim.fieldWidth; x++) {
            for (let y = 0; y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(
                x,
                y,
                Math.max(-5, currentTemp - 15),
              );
            }
          }
          this.sim.weather.current = "snow";
        }
        break;

      case "sand":
      case "sandstorm":
        if (this.sim.setWeather) {
          this.sim.setWeather("sandstorm", durationValue, intensityValue);
        }

        for (let i = 0; i < Math.min(durationValue, 200); i++) {
          this.sim.particleArrays.addParticle({
            id: `sand_${Date.now()}_${i}`,
            type: "sand",
            pos: {
              x: -5 + Simulator.rng.random() * (this.sim.fieldWidth + 10) * 8,
              y: Simulator.rng.random() * this.sim.fieldHeight * 8,
            },
            vel: {
              x: 2 + Simulator.rng.random() * 3,
              y: (Simulator.rng.random() - 0.5) * 0.5,
            },
            radius: 0.5 + Simulator.rng.random() * 0.5,
            color: "#CCAA66",
            lifetime: 100 + Simulator.rng.random() * 50,
          });
        }

        let biomeRule = this.sim.rules?.find(
          (r) => r.constructor.name === "BiomeEffects",
        );
        if (biomeRule && (biomeRule as any).triggerSandstorm) {
          (biomeRule as any).triggerSandstorm(durationValue, intensityValue);
        }
        break;

      case "leaves":
      case "leaf":
        if (this.sim.setWeather) {
          this.sim.setWeather("leaves", durationValue, intensityValue);
        }

        const particleCount = Math.min(durationValue * 2, 30); // Reasonable number of leaves
        for (let i = 0; i < particleCount; i++) {
          this.sim.particleArrays.addParticle({
            id: `leaf_${Date.now()}_${i}`,
            type: "leaf",
            pos: {
              x:
                Math.floor(Simulator.rng.random() * this.sim.fieldWidth) * 8 +
                4, // Center of grid cells
              y: -Simulator.rng.random() * 20, // Start above the field
            },
            vel: {
              x: 0, // No horizontal movement - fall straight down
              y: 0.5, // Consistent downward velocity
            },
            z: 10 + Simulator.rng.random() * 30, // Start high in the air
            lifetime: 300 + Simulator.rng.random() * 200, // Longer lifetime to fall across field
            radius: 1,
            color: "#88AA44",
          });
        }
        this.sim.weather.current = "leaves";
        break;

      case "clear":
        if (this.sim.setWeather) {
          this.sim.setWeather("clear", 1, 0);
        }

        if (this.sim.temperatureField) {
          for (let x = 0; x < this.sim.fieldWidth; x++) {
            for (let y = 0; y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(
                x,
                y,
                Math.min(20, currentTemp + 10),
              );
            }
          }
          this.sim.weather.current = "clear";
        }
        break;

      default:
        console.warn(`Unknown weather type: ${weatherType}`);
    }
  }
}
