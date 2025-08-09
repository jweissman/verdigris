import { Command } from "../rules/command";

export class ChangeWeather extends Command {
  execute(unitId: string | null, weatherType: string, duration?: string, intensity?: string) {
    console.log(`Weather command: ${weatherType} for ${duration || 'default'} duration`);
    
    const durationValue = duration ? parseInt(duration) : 80; // Default 10 seconds at 8fps
    const intensityValue = intensity ? parseFloat(intensity) : 0.8;
    
    switch (weatherType) {
      case 'rain':
        if (this.sim.setWeather) {
          this.sim.setWeather('rain', durationValue, intensityValue);
        }
        break;
        
      case 'winter':
      case 'snow':
        // Enable winter effects
        if (this.sim.temperatureField) {
          console.log('Activating winter storm...');
          // Lower temperature across the field
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
        // Sandstorm weather effect
        if (this.sim.setWeather) {
          this.sim.setWeather('sandstorm', durationValue, intensityValue);
        }
        // Find or create desert effects rule for visual sand particles
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
          console.log('Clearing winter storm...');
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