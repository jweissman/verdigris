import { ScalarField } from "./ScalarField";

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
    this.temperatureField.decay(0.0005);
    
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
  
  addTemperatureGradient(x: number, y: number, radius: number, intensity: number): void {
    this.temperatureField.addGradient(x, y, radius, intensity);
  }
  
  addHumidityGradient(x: number, y: number, radius: number, intensity: number): void {
    this.humidityField.addGradient(x, y, radius, intensity);
  }
  
  setTemperature(x: number, y: number, value: number): void {
    this.temperatureField.set(x, y, value);
  }
  
  addPressure(x: number, y: number, value: number): void {
    this.pressureField.add(x, y, value);
  }
  
  addPressureGradient(x: number, y: number, radius: number, intensity: number): void {
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
}