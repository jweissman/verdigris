import { Rule } from "./rule";
import { Vec2 } from "../sim/types";

export class DesertEffects extends Rule {
  apply = (): void => {
    // Add heat shimmer particles in hot areas
    this.addHeatShimmer();
    
    // Update existing heat particles
    this.updateHeatParticles();
    
    // Apply desert heat effects on units
    this.applyHeatEffects();
  }

  private addHeatShimmer(): void {
    // Add heat shimmer particles based on temperature field
    if (this.sim.ticks % 3 === 0) { // Every 3 ticks for subtle effect
      // Sample multiple points across the field
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * this.sim.fieldWidth);
        const y = Math.floor(Math.random() * this.sim.fieldHeight);
        
        const temperature = this.sim.temperatureField.get(x, y);
        
        // Only create shimmer if temperature is high (above 25°C)
        if (temperature > 25) {
          const intensity = Math.min(1, (temperature - 25) / 20); // Scale 0-1 from 25-45°C
          
          // Skip some particles based on intensity for varied effect
          if (Math.random() > intensity * 0.6) continue;
          
          // Create heat shimmer particle
          this.sim.particles.push({
            pos: { 
              x: x * 8 + Math.random() * 8, 
              y: y * 8 + Math.random() * 8 
            },
            vel: { 
              x: (Math.random() - 0.5) * 0.2, 
              y: -0.1 - Math.random() * 0.2 // Generally rise upward 
            },
            radius: 0.3 + Math.random() * 0.4,
            color: this.getShimmerColor(temperature),
            lifetime: 15 + Math.floor(Math.random() * 15), // 15-30 ticks
            z: Math.random() * 2, // Vary height for depth
            type: 'heat_shimmer'
          });
        }
      }
    }
  }

  private getShimmerColor(temperature: number): string {
    if (temperature > 40) return '#FFAA44'; // Intense heat - orange
    if (temperature > 35) return '#FFCC66'; // Very hot - yellow-orange
    if (temperature > 30) return '#FFDD88'; // Hot - pale yellow
    return '#FFEEAA'; // Warm - very pale yellow
  }

  private updateHeatParticles(): void {
    // Heat shimmer particles have special wobbling motion
    this.sim.particles.forEach(particle => {
      if (particle.type === 'heat_shimmer') {
        // Add subtle horizontal wobble to simulate heat distortion
        const age = 1 - (particle.lifetime / 30); // 0 to 1 as particle ages
        const wobbleIntensity = Math.sin(age * Math.PI) * 0.3; // Stronger in middle of lifetime
        
        particle.vel.x += (Math.random() - 0.5) * wobbleIntensity;
        
        // Gradually fade alpha as particle rises
        const alpha = Math.max(0.1, 1 - age * 0.8);
        
        // Update color with fading alpha
        if (particle.color.includes('#')) {
          const baseColor = particle.color;
          const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
          // Convert to rgba if needed for better fading
          particle.color = baseColor + alphaHex;
        }
      }
    });
  }

  private applyHeatEffects(): void {
    this.sim.units.forEach(unit => {
      // Get temperature at unit's position
      const temp = this.sim.temperatureField.get(unit.pos.x, unit.pos.y);
      
      if (temp > 30) { // Hot conditions
        this.applyHeatStress(unit, temp);
      } else if (temp > 25) { // Warm conditions  
        this.applyWarmthBoost(unit, temp);
      }
    });
  }

  private applyHeatStress(unit: any, temperature: number): void {
    // Units suffer in extreme heat (unless desert-adapted)
    if (!unit.meta.desertAdapted && !unit.meta.heatResistant) {
      if (temperature > 40) {
        // Extreme heat causes fatigue
        if (!unit.meta.statusEffects) {
          unit.meta.statusEffects = [];
        }
        
        const existingHeatStress = unit.meta.statusEffects.find(effect => effect.type === 'heat_stress');
        if (!existingHeatStress) {
          unit.meta.statusEffects.push({
            type: 'heat_stress',
            duration: 30,
            intensity: 0.2, // 20% performance reduction
            source: 'desert_heat'
          });
          
          // Create heat stress visual
          if (Math.random() < 0.1) { // Occasional stress particles
            this.sim.particles.push({
              pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 - 4 },
              vel: { x: (Math.random() - 0.5) * 0.3, y: -0.5 },
              radius: 1,
              color: '#FF6644',
              lifetime: 20,
              type: 'heat_stress'
            });
          }
        }
      }
    }
  }

  private applyWarmthBoost(unit: any, temperature: number): void {
    // Desert-adapted units get small bonuses in warm weather
    if (unit.meta.desertAdapted) {
      if (!unit.meta.statusEffects) {
        unit.meta.statusEffects = [];
      }
      
      const existingBoost = unit.meta.statusEffects.find(effect => effect.type === 'desert_vigor');
      if (!existingBoost) {
        unit.meta.statusEffects.push({
          type: 'desert_vigor',
          duration: 40,
          intensity: 0.1, // 10% performance boost
          source: 'desert_adaptation'
        });
      }
    }
  }

  // Helper method to create desert conditions
  static createDesertHeat(sim: any): void {
    // Raise temperature across the field
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        const currentTemp = sim.temperatureField.get(x, y);
        // Set desert temperatures: 28-42°C with variation
        const baseTemp = 35;
        const variation = (Math.random() - 0.5) * 14; // ±7°C variation
        const desertTemp = Math.max(28, Math.min(42, baseTemp + variation));
        
        sim.temperatureField.set(x, y, desertTemp);
      }
    }
    
    // Add desert weather flag
    sim.desertActive = true;
    console.log('🏜️ Desert heat begins! Temperatures soar across the battlefield.');
  }

  static endDesertHeat(sim: any): void {
    // Gradually cool down the field
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        const currentTemp = sim.temperatureField.get(x, y);
        // Cool down to moderate temperatures
        sim.temperatureField.set(x, y, Math.max(20, currentTemp - 8));
      }
    }
    
    sim.desertActive = false;
    console.log('🌤️ Desert heat subsides. The battlefield cools to moderate temperatures.');
  }
}