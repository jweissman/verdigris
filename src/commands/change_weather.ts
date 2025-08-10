import { Command, CommandParams } from "../rules/command";

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
      case 'rain':
        if (this.sim.setWeather) {
          this.sim.setWeather('rain', durationValue, intensityValue);
        }
        // Create rain particles immediately
        for (let i = 0; i < Math.min(durationValue, 100); i++) {
          this.sim.particles.push({
            id: `rain_${Date.now()}_${i}`,
            type: 'rain',
            pos: { 
              x: Math.random() * this.sim.fieldWidth * 8, 
              y: Math.random() * 10 
            },
            vel: { x: 0, y: 1 + Math.random() * 2 },
            radius: 1,
            color: '#4488CC',
            lifetime: 100
          });
        }
        break;
        
      case 'winter':
      case 'snow':
        if (this.sim.temperatureField) {
          for (let x = 0; x < this.sim.fieldWidth; x++) {
            for (let y = 0; y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(x, y, Math.max(-5, currentTemp - 15));
            }
          }
          this.sim.weather.current = 'snow';
        }
        break;
        
      case 'sand':
      case 'sandstorm':
        if (this.sim.setWeather) {
          this.sim.setWeather('sandstorm', durationValue, intensityValue);
        }
        
        for (let i = 0; i < Math.min(durationValue, 200); i++) {
          this.sim.particles.push({
            id: `sand_${Date.now()}_${i}`,
            type: 'sand',
            pos: { 
              x: -5 + Math.random() * (this.sim.fieldWidth + 10) * 8, 
              y: Math.random() * this.sim.fieldHeight * 8 
            },
            vel: { x: 2 + Math.random() * 3, y: (Math.random() - 0.5) * 0.5 },
            radius: 0.5 + Math.random() * 0.5,
            color: '#D2691E',
            lifetime: 100 + Math.random() * 50
          });
        }
        
        // Also trigger desert effects rule if available
        let desertRule = this.sim.rules?.find(r => r.constructor.name === 'DesertEffects');
        if (desertRule && (desertRule as any).triggerSandstorm) {
          (desertRule as any).triggerSandstorm(durationValue, intensityValue);
        }
        break;
        
      case 'leaves':
      case 'leaf':
        // Falling leaves weather effect
        if (this.sim.setWeather) {
          this.sim.setWeather('leaves', durationValue, intensityValue);
        }
        // Create leaf particles
        for (let i = 0; i < durationValue; i++) {
          this.sim.particles.push({
            id: `leaf_${Date.now()}_${i}`,
            type: 'leaf',
            pos: { 
              x: Math.random() * this.sim.fieldWidth, 
              y: Math.random() * this.sim.fieldHeight 
            },
            vel: { x: Math.random() * 0.2 - 0.1, y: 0.1 + Math.random() * 0.1 },
            z: 5 + Math.random() * 10,
            lifetime: 100 + Math.random() * 100,
            meta: {
              swayAmplitude: 0.5 + Math.random() * 0.5,
              swayFrequency: 0.05 + Math.random() * 0.05,
              swayPhase: Math.random() * Math.PI * 2
            }
          });
        }
        this.sim.weather.current = 'leaves';
        break;
        
      case 'clear':
        if (this.sim.setWeather) {
          this.sim.setWeather('clear', 1, 0);
        }
        // Warm up from winter
        if (this.sim.temperatureField) {
          for (let x = 0; x < this.sim.fieldWidth; x++) {
            for (let y = 0; y < this.sim.fieldHeight; y++) {
              const currentTemp = this.sim.temperatureField.get(x, y);
              this.sim.temperatureField.set(x, y, Math.min(20, currentTemp + 10));
            }
          }
          this.sim.weather.current = 'clear';
        }
        break;
        
      default:
        console.warn(`Unknown weather type: ${weatherType}`);
    }
  }
}