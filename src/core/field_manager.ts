import { ScalarField } from "./ScalarField";
import { Unit } from "../types/Unit";
import { RNG } from "./rng";

/**
 * Manages scalar fields (temperature, humidity, pressure) for environmental effects
 */
export class FieldManager {
  private temperatureField: ScalarField;
  private humidityField: ScalarField;
  private pressureField: ScalarField;

  constructor(width: number, height: number) {
    this.temperatureField = new ScalarField(width, height, 20); // Default 20C ambient temp
    this.humidityField = new ScalarField(width, height, 0.5); // 50% humidity
    this.pressureField = new ScalarField(width, height, 1.0); // 1 atm pressure
  }

  getTemperature(x: number, y: number): number {
    return this.temperatureField.get(x, y);
  }

  getHumidity(x: number, y: number): number {
    return this.humidityField.get(x, y);
  }

  getPressure(x: number, y: number): number {
    return this.pressureField.get(x, y);
  }

  getAverageTemperature(): number {
    const width = this.temperatureField.width;
    const height = this.temperatureField.height;
    let total = 0;
    let count = 0;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        total += this.temperatureField.get(x, y);
        count++;
      }
    }

    return count > 0 ? Math.round(total / count) : 20;
  }

  updateFields(): void {
    // Diffuse and decay fields
    this.temperatureField.diffuse(0.02);

    // Enhanced decay for hot temperatures (fire dies down)
    const width = this.temperatureField.width;
    const height = this.temperatureField.height;
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const temp = this.temperatureField.get(x, y);
        if (temp > 100) {
          // Fire temperatures decay faster
          const decayRate = 0.02 * (temp / 100); // Faster decay for hotter temps
          this.temperatureField.add(x, y, -decayRate);
        } else if (temp > 30) {
          // Warm temps decay moderately
          this.temperatureField.add(x, y, -0.005);
        } else {
          // Normal decay for ambient temps
          this.temperatureField.add(x, y, -0.0005);
        }
      }
    }

    this.humidityField.diffuse(0.03);
    this.humidityField.decay(0.001);

    this.pressureField.decayAndDiffuse(0.01, 0.12);
  }

  applyFieldInteractions(ticks: number): void {
    const width = this.temperatureField.width;
    const height = this.temperatureField.height;

    const startY = (ticks % 10) * Math.floor(height / 10);
    const endY = Math.min(startY + Math.floor(height / 10), height);

    for (let y = startY; y < endY; y++) {
      for (let x = 0; x < width; x++) {
        const temp = this.temperatureField.get(x, y);
        const humidity = this.humidityField.get(x, y);

        // Hot air causes evaporation
        if (temp > 30) {
          const evaporation = (temp - 30) * 0.001;
          this.humidityField.add(x, y, -evaporation);
        }

        // High humidity causes condensation
        if (humidity > 0.8) {
          const condensation = (humidity - 0.8) * 0.01;
          this.humidityField.add(x, y, -condensation);
        }
      }
    }
  }

  addTemperatureGradient(
    x: number,
    y: number,
    radius: number,
    intensity: number,
  ): void {
    this.temperatureField.addGradient(x, y, radius, intensity);
  }

  addHumidityGradient(
    x: number,
    y: number,
    radius: number,
    intensity: number,
  ): void {
    this.humidityField.addGradient(x, y, radius, intensity);
  }

  setTemperature(x: number, y: number, value: number): void {
    this.temperatureField.set(x, y, value);
  }

  addPressure(x: number, y: number, value: number): void {
    this.pressureField.add(x, y, value);
  }

  addPressureGradient(
    x: number,
    y: number,
    radius: number,
    intensity: number,
  ): void {
    this.pressureField.addGradient(x, y, radius, intensity);
  }

  getTemperatureField(): ScalarField {
    return this.temperatureField;
  }

  getHumidityField(): ScalarField {
    return this.humidityField;
  }

  getPressureField(): ScalarField {
    return this.pressureField;
  }

  // Aliases for compatibility
  updateScalarFields(): void {
    this.updateFields();
  }

  addHeat(x: number, y: number, intensity: number, radius: number = 2): void {
    this.addTemperatureGradient(x, y, radius, intensity);
  }

  addMoisture(
    x: number,
    y: number,
    intensity: number,
    radius: number = 3,
  ): void {
    this.addHumidityGradient(x, y, radius, intensity);
  }

  adjustPressure(
    x: number,
    y: number,
    intensity: number,
    radius: number = 4,
  ): void {
    this.addPressureGradient(x, y, radius, intensity);
  }

  updateUnitTemperatureEffects(units: readonly Unit[]): void {
    for (const unit of units) {
      if (unit.meta.phantom || unit.state === "dead") continue;
      const x = Math.floor(unit.pos.x);
      const y = Math.floor(unit.pos.y);

      if (unit.type === "freezebot") {
        const temp = this.temperatureField.get(x, y);
        if (temp > 0) {
          this.temperatureField.addGradient(x, y, 4, -0.5);
          this.temperatureField.set(x, y, temp * 0.95);
        }
      } else if (unit.tags?.includes("construct")) {
        this.temperatureField.addGradient(x, y, 2, 1.0);
      } else {
        this.temperatureField.addGradient(x, y, 2, 0.5);
      }

      if (unit.state === "walk" || unit.state === "attack") {
        this.humidityField.addGradient(x, y, 1.5, 0.02);
      }
    }
  }

  applyRainEffects(intensity: number, rng: RNG): void {
    const width = this.temperatureField.width;
    const height = this.temperatureField.height;

    for (let i = 0; i < Math.ceil(intensity * 5); i++) {
      this.humidityField.addGradient(
        rng.random() * width,
        rng.random() * height,
        2,
        intensity * 0.1,
      );
    }
    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      this.temperatureField.addGradient(
        rng.random() * width,
        rng.random() * height,
        3,
        -intensity * 2,
      );
    }
  }

  applyStormPressureEffects(intensity: number, rng: RNG): void {
    const width = this.temperatureField.width;
    const height = this.temperatureField.height;

    for (let i = 0; i < Math.ceil(intensity * 3); i++) {
      this.pressureField.addGradient(
        rng.random() * width,
        rng.random() * height,
        4,
        (rng.random() - 0.5) * intensity * 0.2,
      );
    }
  }
}
