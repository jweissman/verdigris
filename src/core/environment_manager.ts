import { ScalarField } from "./ScalarField";
import { Particle } from "../types/Particle";

/**
 * Manages environmental effects like weather, temperature, humidity
 * Extracted from Simulator to reduce god object responsibilities
 */
export class EnvironmentManager {
  private _temperatureField: ScalarField | null = null;
  private _humidityField: ScalarField | null = null;
  private _pressureField: ScalarField | null = null;

  public weather: {
    rain: boolean;
    snow: boolean;
    leaves: boolean;
    storm: boolean;
    sandstorm: boolean;
    intensity: number;
  } = {
    rain: false,
    snow: false,
    leaves: false,
    storm: false,
    sandstorm: false,
    intensity: 0,
  };

  public winterActive: boolean = false;
  public sandstormActive: boolean = false;
  public sandstormIntensity: number = 0;
  public sandstormDuration: number = 0;

  constructor(
    private fieldWidth: number,
    private fieldHeight: number,
  ) {}

  get temperatureField(): ScalarField {
    if (!this._temperatureField) {
      this._temperatureField = new ScalarField(
        this.fieldWidth,
        this.fieldHeight,
        20,
      );
    }
    return this._temperatureField;
  }

  get humidityField(): ScalarField {
    if (!this._humidityField) {
      this._humidityField = new ScalarField(
        this.fieldWidth,
        this.fieldHeight,
        0.3,
      );
    }
    return this._humidityField;
  }

  get pressureField(): ScalarField {
    if (!this._pressureField) {
      this._pressureField = new ScalarField(
        this.fieldWidth,
        this.fieldHeight,
        1.0,
      );
    }
    return this._pressureField;
  }

  addHeat(x: number, y: number, intensity: number, radius: number = 2): void {
    this.temperatureField.addGradient(x, y, radius, intensity);
  }

  addMoisture(x: number, y: number, amount: number, radius: number = 1): void {
    this.humidityField.addGradient(x, y, radius, amount);
  }

  getTemperatureAt(x: number, y: number): number {
    return this.temperatureField.get(x, y);
  }

  getHumidityAt(x: number, y: number): number {
    return this.humidityField.get(x, y);
  }

  updateScalarFields(): void {
    if (this._temperatureField) {
      this._temperatureField.diffuse();
      this._temperatureField.decay();
    }
    if (this._humidityField) {
      this._humidityField.diffuse();
      this._humidityField.decay();
    }
    if (this._pressureField) {
      this._pressureField.diffuse();
      this._pressureField.decay();
    }
  }

  applyFieldInteractions(): void {
    if (!this._temperatureField || !this._humidityField) return;

    const temp = this._temperatureField;
    const humidity = this._humidityField;

    for (let x = 0; x < this.fieldWidth; x++) {
      for (let y = 0; y < this.fieldHeight; y++) {
        const t = temp.get(x, y);
        if (t > 30) {
          const evaporation = (t - 30) * 0.01;
          humidity.add(x, y, -evaporation);
        }
      }
    }
  }

  setWeather(
    type: "rain" | "snow" | "storm" | "sandstorm" | "leaves",
    active: boolean,
    intensity: number = 1,
  ): void {
    this.weather[type] = active;
    if (active) {
      this.weather.intensity = intensity;
    }
  }
}
