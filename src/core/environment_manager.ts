/**
 * Manages environmental state like weather, background, and battlefield properties.
 * Extracted from Simulator to reduce god class responsibilities.
 */
export class EnvironmentManager {
  public background: string = "grass";
  public stripWidth: number = 1;
  public battleHeight: number = 1;
  
  private weather: {
    type: string;
    duration: number;
    intensity: number;
    startTick: number;
  } | null = null;
  
  private currentTick: number = 0;

  setBackground(value: string): void {
    this.background = value;
  }

  setStripWidth(value: number): void {
    this.stripWidth = value;
  }

  setBattleHeight(value: number): void {
    this.battleHeight = value;
  }

  setWeather(type: string, duration: number, intensity: number): void {
    this.weather = {
      type,
      duration,
      intensity,
      startTick: this.currentTick
    };
  }

  updateTick(tick: number): void {
    this.currentTick = tick;
    
    // Check if weather has expired
    if (this.weather) {
      const elapsed = tick - this.weather.startTick;
      if (elapsed >= this.weather.duration) {
        this.weather = null;
      }
    }
  }

  getCurrentWeather(): string {
    return this.weather?.type || "clear";
  }

  getWeatherIntensity(): number {
    return this.weather?.intensity || 0;
  }

  getWeatherDuration(): number {
    if (!this.weather) return 0;
    const elapsed = this.currentTick - this.weather.startTick;
    return Math.max(0, this.weather.duration - elapsed);
  }

  isWinterActive(): boolean {
    return this.weather?.type === "winter";
  }

  isSandstormActive(): boolean {
    return this.weather?.type === "sandstorm";
  }

  getSandstormIntensity(): number {
    return this.weather?.type === "sandstorm" ? (this.weather.intensity || 0.5) : 0;
  }

  getSandstormDuration(): number {
    return this.weather?.type === "sandstorm" ? this.getWeatherDuration() : 0;
  }

  // Biome detection based on background
  getCurrentBiome(): string {
    const biomeMap: Record<string, string> = {
      "grass": "grassland",
      "forest": "forest",
      "sand": "desert",
      "desert": "desert",
      "snow": "tundra",
      "tundra": "tundra",
      "water": "ocean",
      "ocean": "ocean",
      "cave": "underground",
      "dungeon": "underground",
      "castle": "urban",
      "city": "urban"
    };
    
    return biomeMap[this.background] || "neutral";
  }

  isDesertBiome(): boolean {
    return this.getCurrentBiome() === "desert";
  }

  isTundraBiome(): boolean {
    return this.getCurrentBiome() === "tundra";
  }

  isOceanBiome(): boolean {
    return this.getCurrentBiome() === "ocean";
  }
}