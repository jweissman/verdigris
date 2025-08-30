import { RNG } from "./rng";
import { FieldManager } from "./field_manager";
import { ParticleManager } from "./particle_manager";

/**
 * Handles weather effect application
 * Extracted from Simulator to reduce complexity
 */
export class WeatherEffects {
  constructor(
    private fieldManager: FieldManager,
    private particleManager: ParticleManager,
    private fieldWidth: number,
    private fieldHeight: number,
    private rng: RNG,
  ) {}

  applyWeatherEffects(weatherType: string, intensity: number, ticks: number) {
    switch (weatherType) {
      case "rain":
        this.applyRainEffects(intensity);
        break;
      case "storm":
        this.applyStormEffects(intensity);
        break;
      case "leaves":
        this.applyLeavesEffects(intensity, ticks);
        break;
      case "snow":
        // Snow effects handled by BiomeEffects rule
        break;
      case "sandstorm":
        // Sandstorm effects handled by BiomeEffects rule
        break;
    }
  }

  private applyRainEffects(intensity: number) {
    for (let i = 0; i < Math.ceil(intensity * 5); i++) {
      const x = this.rng.random() * this.fieldWidth;
      const y = this.rng.random() * this.fieldHeight;
      this.fieldManager.addHumidityGradient(x, y, 2, intensity * 0.1);
    }

    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = this.rng.random() * this.fieldWidth;
      const y = this.rng.random() * this.fieldHeight;
      this.fieldManager.addTemperatureGradient(x, y, 3, -intensity * 2);
    }

    if (this.rng.random() < intensity * 0.5) {
      this.spawnRainParticle();
    }

    this.extinguishFires();
  }

  private applyStormEffects(intensity: number) {
    this.applyRainEffects(intensity);

    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      const x = this.rng.random() * this.fieldWidth;
      const y = this.rng.random() * this.fieldHeight;
      const pressureChange = (this.rng.random() - 0.5) * intensity * 0.2;
      this.fieldManager.addPressureGradient(x, y, 4, pressureChange);
    }
  }

  private applyLeavesEffects(intensity: number, ticks: number) {
    if (this.rng.random() < intensity * 0.3) {
      const leafCount = 1 + Math.floor(this.rng.random() * 3);
      for (let i = 0; i < leafCount; i++) {
        this.particleManager.particleArrays.addParticle({
          id: `leaf_${Date.now()}_${ticks}_${i}`,
          type: "leaf",
          pos: {
            x: this.rng.random() * this.fieldWidth * 8, // Spread across full width
            y: -10 - this.rng.random() * 10, // Start above the field
          },
          vel: {
            x: 0, // No horizontal drift - fall straight down
            y: 0.2 + this.rng.random() * 0.2, // Slow fall
          },
          z: 15 + this.rng.random() * 25, // Varying heights
          lifetime: 400 + this.rng.random() * 200, // Long lifetime to cross field
          radius: 1,
          color: "green",
        });
      }
    }
  }

  spawnRainParticle() {
    this.particleManager.particleArrays.addParticle({
      pos: {
        x: this.rng.random() * this.fieldWidth,
        y: -1, // Start above visible area
      },
      vel: {
        x: 0, // No horizontal movement - fall straight down
        y: 0.8 + this.rng.random() * 0.4, // Fast downward
      },
      radius: 0.5 + this.rng.random() * 0.5, // Small drops
      lifetime: 50 + this.rng.random() * 30, // Short lifetime
      z: 5 + this.rng.random() * 10, // Start at moderate height
      type: "rain",
      landed: false,
    });
  }

  spawnFireParticle(x: number, y: number) {
    this.particleManager.particleArrays.addParticle({
      pos: { x, y },
      vel: {
        x: (this.rng.random() - 0.5) * 0.4, // Random horizontal spread
        y: -0.2 - this.rng.random() * 0.3, // Upward movement (fire rises)
      },
      radius: 0.8 + this.rng.random() * 0.7, // Variable spark size
      lifetime: 30 + this.rng.random() * 40, // Medium lifetime
      type: "fire",
      color: this.rng.random() > 0.5 ? "#ff4400" : "#ff8800", // Orange to red
    });
  }

  extinguishFires() {
    // Find and remove units with "fire" tag
    // This requires access to units which we don't have here
    // So this will need to be called from Simulator still
  }
}
