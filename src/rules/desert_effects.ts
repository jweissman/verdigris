import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

// NOTE: This and all specialized effect modules should just be scalar fields?
export class DesertEffects extends Rule {

  private sandstormActive: boolean = false;
  private sandstormDuration: number = 0;
  private sandstormIntensity: number = 0;

  execute(context: TickContext): void {
    // Check for sandstorm activation
    this.updateSandstorm();
    
    // Add heat shimmer particles in hot areas
    this.addHeatShimmer(context);
    
    // Add sandstorm particles if active
    if (this.sandstormActive) {
      this.addSandstormParticles(context);
      this.applySandstormEffects(context);
    }
    
    // Update existing heat particles
    this.updateHeatParticles(context);
    
    // Apply desert heat effects on units
    this.applyHeatEffects(context);
    
    // Handle burrowed units
    this.handleBurrowedUnits(context);
  }

  private addHeatShimmer(context: TickContext): void {
    // Add heat shimmer particles based on temperature field
    if (context.getCurrentTick() % 3 === 0) { // Every 3 ticks for subtle effect
      // Sample multiple points across the field
      for (let i = 0; i < 8; i++) {
        const x = Math.floor(context.getRandom() * context.getFieldWidth());
        const y = Math.floor(context.getRandom() * context.getFieldHeight());
        
        // TODO: Need temperature field access through context
        const temperature = 30; // Default warm temperature
        
        // Only create shimmer if temperature is high (above 25°C)
        if (temperature > 25) {
          const intensity = Math.min(1, (temperature - 25) / 20); // Scale 0-1 from 25-45°C
          
          // Skip some particles based on intensity for varied effect
          if (context.getRandom() > intensity * 0.6) continue;
          
          // Create heat shimmer particle
          context.queueEvent({
            kind: 'particle',
            source: 'desert',
            meta: {
              pos: { 
                x: x * 8 + context.getRandom() * 8, 
                y: y * 8 + context.getRandom() * 8 
              },
              vel: { 
                x: (context.getRandom() - 0.5) * 0.2, 
                y: -0.1 - context.getRandom() * 0.2 // Generally rise upward 
              },
              radius: 0.3 + context.getRandom() * 0.4,
              color: this.getShimmerColor(temperature),
              lifetime: 15 + Math.floor(context.getRandom() * 15), // 15-30 ticks
              z: context.getRandom() * 2, // Vary height for depth
              type: 'heat_shimmer'
            }
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

  private updateHeatParticles(context: TickContext): void {
    // Heat shimmer particles have special wobbling motion
    // TODO: Need particle access through context
    // For now, we can't directly update particles - they need to be handled via events
    return;
  }

  private applyHeatEffects(context: TickContext): void {
    context.getAllUnits().forEach(unit => {
      // Get temperature at unit's position
      // TODO: Need temperature field access through context
      const temp = 30; // Default warm temperature
      
      if (temp > 30) { // Hot conditions
        this.applyHeatStress(context, unit, temp);
      } else if (temp > 25) { // Warm conditions  
        this.applyWarmthBoost(context, unit, temp);
      }
    });
  }

  private applyHeatStress(context: TickContext, unit: any, temperature: number): void {
    // Units suffer in extreme heat (unless desert-adapted)
    if (!unit.meta.desertAdapted && !unit.meta.heatResistant) {
      if (temperature > 40) {
        // Extreme heat causes fatigue
        const statusEffects = unit.meta.statusEffects || [];
        
        const existingHeatStress = statusEffects.find(effect => effect.type === 'heat_stress');
        if (!existingHeatStress) {
          // Queue status effect command
          context.queueCommand({
            type: 'applyStatusEffect',
            params: {
              unitId: unit.id,
              effect: {
                type: 'heat_stress',
                duration: 30,
                intensity: 0.2, // 20% performance reduction
                source: 'desert_heat'
              }
            }
          });
          
          // Create heat stress visual
          if (context.getRandom() < 0.1) { // Occasional stress particles
            context.queueEvent({
              kind: 'particle',
              source: 'desert',
              meta: {
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 - 4 },
                vel: { x: (context.getRandom() - 0.5) * 0.3, y: -0.5 },
                radius: 1,
                color: '#FF6644',
                lifetime: 20,
                type: 'heat_stress'
              }
            });
          }
        }
      }
    }
  }

  private applyWarmthBoost(context: TickContext, unit: any, temperature: number): void {
    // Desert-adapted units get small bonuses in warm weather
    if (unit.meta.desertAdapted) {
      const statusEffects = unit.meta.statusEffects || [];
      
      const existingBoost = statusEffects.find(effect => effect.type === 'desert_vigor');
      if (!existingBoost) {
        // Queue status effect command
        context.queueCommand({
          type: 'applyStatusEffect',
          params: {
            unitId: unit.id,
            effect: {
              type: 'desert_vigor',
              duration: 40,
              intensity: 0.1, // 10% performance boost
              source: 'desert_adaptation'
            }
          }
        });
      }
    }
  }

  // Helper method to create desert conditions
  static createDesertHeat(context: TickContext): void {
    // Raise temperature across the field
    // TODO: Need temperature field modification through context
    context.queueCommand({
      type: 'temperature',
      params: {
        amount: 15 // Raise by 15 degrees globally to desert temps
      }
    });
  }

  static endDesertHeat(context: TickContext): void {
    // Gradually cool down the field
    // TODO: Need temperature field modification through context
    context.queueCommand({
      type: 'temperature',
      params: {
        amount: -8 // Cool by 8 degrees globally
      }
    });
  }

  private updateSandstorm(): void {
    if (this.sandstormDuration > 0) {
      this.sandstormDuration--;
      if (this.sandstormDuration === 0) {
        this.sandstormActive = false;
        this.sandstormIntensity = 0;
        // Clear effects will be called in execute
      }
    }
  }

  public startSandstorm(duration: number = 160, intensity: number = 0.8): void {
    this.sandstormActive = true;
    this.sandstormDuration = duration;
    this.sandstormIntensity = intensity;
    // TODO: Set global sandstorm flag if needed
  }

  private addSandstormParticles(context: TickContext): void {
    // Add sand particles based on intensity
    const particleCount = Math.floor(5 * this.sandstormIntensity);
    
    if (context.getCurrentTick() % 3 === 0) { // Less frequent but more particles
      for (let i = 0; i < particleCount; i++) {
        // Sand blows horizontally across the field
        const y = context.getRandom() * context.getFieldHeight();
        const x = context.getRandom() < 0.5 ? 0 : context.getFieldWidth() - 1;
        const velX = x === 0 ? 0.3 + context.getRandom() * 0.2 : -0.3 - context.getRandom() * 0.2;
        
        context.queueEvent({
          kind: 'particle',
          source: 'sandstorm',
          meta: {
            pos: { x: x * 8, y: y * 8 },
            vel: { x: velX, y: (context.getRandom() - 0.5) * 0.1 },
            radius: 0.5 + context.getRandom() * 0.5,
            lifetime: 100,
            color: '#D2691E', // Sandy brown
            z: 3,
            type: 'sand',
            intensity: this.sandstormIntensity
          }
        });
      }
    }
  }

  private applySandstormEffects(context: TickContext): void {
    // Apply effects to units caught in sandstorm
    context.getAllUnits().forEach((unit: Unit) => {
      // Desert-adapted units are immune
      if (unit.meta.desertAdapted || unit.meta.sandAdapted) {
        return;
      }
      
      // Reduce visibility (accuracy debuff)
      if (!unit.meta.sandBlinded) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              sandBlinded: true,
              accuracy: (unit.meta.accuracy || 1.0) * (1 - this.sandstormIntensity * 0.3)
            }
          }
        });
      }
      
      // Slow movement slightly
      if (!unit.meta.sandSlowed) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              sandSlowed: true,
              moveSpeedMult: (unit.meta.moveSpeedMult || 1.0) * (1 - this.sandstormIntensity * 0.2)
            }
          }
        });
      }
      
      // Small chance of sand damage
      if (context.getCurrentTick() % 40 === 0 && context.getRandom() < this.sandstormIntensity * 0.2) {
        context.queueEvent({
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

  private clearSandstormEffects(context: TickContext): void {
    // Remove sandstorm debuffs from all units
    context.getAllUnits().forEach((unit: Unit) => {
      if (unit.meta.sandBlinded || unit.meta.sandSlowed) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              sandBlinded: false,
              sandSlowed: false,
              accuracy: 1.0,
              moveSpeedMult: 1.0
            }
          }
        });
      }
    });
    // TODO: Clear global sandstorm flag if needed
  }

  private handleBurrowedUnits(context: TickContext): void {
    context.getAllUnits().forEach((unit: Unit) => {
      if (unit.meta.burrowed && unit.meta.emergeTime) {
        // Check if it's time to emerge
        if (context.getCurrentTick() >= unit.meta.emergeTime) {
          const target = unit.meta.burrowTarget;
          
          // Emerge near target
          if (target) {
            // Queue move command for emerging unit
            const newX = Math.max(0, Math.min(context.getFieldWidth() - 1, target.x));
            const newY = Math.max(0, Math.min(context.getFieldHeight() - 1, target.y));
            context.queueCommand({
              type: 'move',
              params: {
                unitId: unit.id,
                dx: newX - unit.pos.x,
                dy: newY - unit.pos.y
              }
            });
            
            // Deal ambush damage
            const victim = context.getAllUnits().find(u => 
              u.team !== unit.team &&
              Math.abs(u.pos.x - unit.pos.x) <= 1 &&
              Math.abs(u.pos.y - unit.pos.y) <= 1
            );
            
            if (victim) {
              context.queueEvent({
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
              context.queueEvent({
                kind: 'particle',
                source: 'sandstorm',
                meta: {
                  pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                  vel: { 
                    x: Math.cos(angle) * 1.2, 
                    y: Math.sin(angle) * 1.2 
                  },
                  radius: 2,
                  color: '#D2691E',
                  lifetime: 30,
                  type: 'sand_burst'
                }
              });
            }
          }
          
          // Clear burrow state via command
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                burrowed: false,
                burrowTarget: undefined,
                emergeTime: undefined,
                invisible: false
              }
            }
          });
        }
      }
    });
  }

  // Public method to be called by commands or abilities
  public triggerSandstorm(duration?: number, intensity?: number): void {
    this.startSandstorm(duration, intensity);
  }
}