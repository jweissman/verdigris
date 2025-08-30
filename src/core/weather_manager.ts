/**
 * Manages weather effects separately from core simulation
 */
export class WeatherManager {
  public weather: {
    current:
      | "clear"
      | "rain"
      | "snow"
      | "sandstorm"
      | "fog"
      | "storm"
      | "leaves"
      | "lightning";
    duration: number;
    intensity: number;
  };

  public lightningActive?: boolean;

  constructor() {
    this.weather = {
      current: "clear",
      duration: 0,
      intensity: 0,
    };
  }

  getCurrentWeather(): string {
    return this.weather.current;
  }

  setWeather(
    type:
      | "clear"
      | "rain"
      | "snow"
      | "sandstorm"
      | "fog"
      | "storm"
      | "leaves"
      | "lightning",
    duration: number,
    intensity: number = 0.5,
  ): void {
    this.weather.current = type;
    this.weather.duration = duration;
    this.weather.intensity = intensity;

    if (type === "lightning") {
      this.lightningActive = true;
    }
  }

  updateWeather(): void {
    if (this.weather.duration > 0) {
      this.weather.duration--;

      if (this.weather.duration <= 0) {
        this.weather.current = "clear";
        this.weather.intensity = 0;
        this.lightningActive = false;
      }
    }
  }

  processWeatherCommand(command: string, ...args: any[]): void {
    switch (command) {
      case "rain":
        const duration =
          typeof args[0] === "string" ? parseInt(args[0]) : args[0] || 200;
        const intensity =
          typeof args[1] === "string" ? parseFloat(args[1]) : args[1] || 0.5;
        this.setWeather("rain", duration, intensity);
        break;
      case "storm":
        const stormDuration =
          typeof args[0] === "string" ? parseInt(args[0]) : args[0] || 300;
        const stormIntensity =
          typeof args[1] === "string" ? parseFloat(args[1]) : args[1] || 0.8;
        this.setWeather("storm", stormDuration, stormIntensity);
        break;
      case "clear":
        this.setWeather("clear", 0, 0);
        break;
      default:
        console.warn(`Unknown weather command: ${command}`);
    }
  }

  isWinterActive(): boolean {
    return this.weather.current === "snow";
  }

  isSandstormActive(): boolean {
    return this.weather.current === "sandstorm";
  }

  getSandstormIntensity(): number {
    return this.weather.current === "sandstorm" ? this.weather.intensity : 0;
  }

  getSandstormDuration(): number {
    return this.weather.current === "sandstorm" ? this.weather.duration : 0;
  }
}
