import { Rule } from "./rule";
import { Vec2, Unit } from "../sim/types";

export class DesertEffects extends Rule {
  private sandstormActive: boolean = false;
  private sandstormDuration: number = 0;
  private sandstormIntensity: number = 0;

  apply = (): void => {
    // Check for sandstorm activation
    this.updateSandstorm();
    
    // Add heat shimmer particles in hot areas
    this.addHeatShimmer();
    
    // Add sandstorm particles if active
    if (this.sandstormActive) {
      this.addSandstormParticles();
      this.applySandstormEffects();
    }
    
    // Update existing heat particles
    this.updateHeatParticles();
    
    // Apply desert heat effects on units
    this.applyHeatEffects();
    
    // Handle burrowed units
    this.handleBurrowedUnits();
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

  private updateSandstorm(): void {
    if (this.sandstormDuration > 0) {
      this.sandstormDuration--;
      if (this.sandstormDuration === 0) {
        console.log("🏜️ Sandstorm subsides...");
        this.sandstormActive = false;
        this.sandstormIntensity = 0;
        this.clearSandstormEffects();
      }
    }
  }

  public startSandstorm(duration: number = 160, intensity: number = 0.8): void {
    console.log(`🏜️ Sandstorm begins! Duration: ${duration}, Intensity: ${intensity}`);
    this.sandstormActive = true;
    this.sandstormDuration = duration;
    this.sandstormIntensity = intensity;
    this.sim.sandstormActive = true;
  }

  private addSandstormParticles(): void {
    // Add sand particles based on intensity
    const particleCount = Math.floor(5 * this.sandstormIntensity);
    
    if (this.sim.ticks % 3 === 0) { // Less frequent but more particles
      for (let i = 0; i < particleCount; i++) {
        // Sand blows horizontally across the field
        const y = Math.random() * this.sim.fieldHeight;
        const x = Math.random() < 0.5 ? 0 : this.sim.fieldWidth - 1;
        const velX = x === 0 ? 0.3 + Math.random() * 0.2 : -0.3 - Math.random() * 0.2;
        
        this.sim.particles.push({
          pos: { x: x * 8, y: y * 8 },
          vel: { x: velX, y: (Math.random() - 0.5) * 0.1 },
          radius: 0.5 + Math.random() * 0.5,
          lifetime: 100,
          color: '#D2691E', // Sandy brown
          z: 3,
          type: 'sand',
          intensity: this.sandstormIntensity
        });
      }
    }
  }

  private applySandstormEffects(): void {
    // Apply effects to units caught in sandstorm
    this.sim.units.forEach((unit: Unit) => {
      // Desert-adapted units are immune
      if (unit.meta.desertAdapted || unit.meta.sandAdapted) {
        return;
      }
      
      // Reduce visibility (accuracy debuff)
      if (!unit.meta.sandBlinded) {
        unit.meta.sandBlinded = true;
        unit.meta.accuracy = (unit.meta.accuracy || 1.0) * (1 - this.sandstormIntensity * 0.3);
      }
      
      // Slow movement slightly
      if (!unit.meta.sandSlowed) {
        unit.meta.sandSlowed = true;
        unit.meta.moveSpeedMult = (unit.meta.moveSpeedMult || 1.0) * (1 - this.sandstormIntensity * 0.2);
      }
      
      // Small chance of sand damage
      if (this.sim.ticks % 40 === 0 && Math.random() < this.sandstormIntensity * 0.2) {
        this.sim.queuedEvents.push({
          kind: 'damage',
          source: 'sandstorm',
          target: unit.id,
          meta: {
            aspect: 'sand',
            amount: 2,
            origin: unit.pos
          }
        });
      }
    });
  }

  private clearSandstormEffects(): void {
    // Remove sandstorm debuffs from all units
    this.sim.units.forEach((unit: Unit) => {
      delete unit.meta.sandBlinded;
      delete unit.meta.sandSlowed;
      unit.meta.accuracy = 1.0;
      unit.meta.moveSpeedMult = 1.0;
    });
    this.sim.sandstormActive = false;
  }

  private handleBurrowedUnits(): void {
    this.sim.units.forEach((unit: Unit) => {
      if (unit.meta.burrowed && unit.meta.emergeTime) {
        // Check if it's time to emerge
        if (this.sim.ticks >= unit.meta.emergeTime) {
          const target = unit.meta.burrowTarget;
          
          // Emerge near target
          if (target) {
            console.log(`${unit.id} emerges from the sand!`);
            
            // Move to target position
            unit.pos = {
              x: Math.max(0, Math.min(this.sim.fieldWidth - 1, target.x)),
              y: Math.max(0, Math.min(this.sim.fieldHeight - 1, target.y))
            };
            
            // Deal ambush damage
            const victim = this.sim.units.find(u => 
              u.team !== unit.team &&
              Math.abs(u.pos.x - unit.pos.x) <= 1 &&
              Math.abs(u.pos.y - unit.pos.y) <= 1
            );
            
            if (victim) {
              this.sim.queuedEvents.push({
                kind: 'damage',
                source: unit.id,
                target: victim.id,
                meta: {
                  aspect: 'ambush',
                  amount: 20,
                  origin: unit.pos
                }
              });
            }
            
            // Sand burst on emergence
            for (let i = 0; i < 15; i++) {
              const angle = (i / 15) * Math.PI * 2;
              this.sim.particles.push({
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                vel: { 
                  x: Math.cos(angle) * 1.2, 
                  y: Math.sin(angle) * 1.2 
                },
                radius: 2,
                color: '#D2691E',
                lifetime: 30,
                type: 'sand_burst'
              });
            }
          }
          
          // Clear burrow state
          delete unit.meta.burrowed;
          delete unit.meta.burrowTarget;
          delete unit.meta.emergeTime;
          delete unit.meta.invisible;
        }
      }
    });
  }

  // Public method to be called by commands or abilities
  public triggerSandstorm(duration?: number, intensity?: number): void {
    this.startSandstorm(duration, intensity);
  }
}