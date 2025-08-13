import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

export class WinterEffects extends Rule {
  apply = (): void => {
    // Add snowfall particles
    this.addSnowfall();
    
    // Update particle physics and handle collisions
    this.updateParticles();
    
    // Process cold temperature effects on units
    this.processColdEffects();
    
    // Handle frozen units
    this.handleFrozenUnits();
  }

  private addSnowfall(): void {
    // Add snowflakes as particles periodically
    if (this.sim.ticks % 5 === 0) { // Less frequent for cleaner effect
      for (let i = 0; i < 3; i++) { // More snowflakes for better hit chance
        // Focus snowfall around units - bias toward center 20x20 area
        let x: number;
        if (this.rng.random() < 0.7) {
          // 70% chance to fall in center area where units usually are
          x = 5 + Math.floor(this.rng.random() * 20); // x range 5-25
        } else {
          // 30% chance anywhere on field
          x = Math.floor(this.rng.random() * this.sim.fieldWidth);
        }
        const y = 0; // Start at top
        
        this.sim.particles.push({
          pos: { x, y },
          vel: { x: 0, y: 0.15 }, // Pure vertical fall, slower
          radius: 0.25, // Truly single pixel
          lifetime: 200, // Shorter lifetime but more focused
          color: '#FFFFFF',
          z: 5,
          type: 'snow',
          landed: false,
          targetCell: { x: Math.floor(x), y: this.sim.fieldHeight - 1 } // Track exact landing cell
        });
      }
    }
  }

  private updateParticles(): void {
    // Update particle positions and handle collisions
    this.sim.particles.forEach(particle => {
      if (particle.type === 'snow' && !particle.landed) {
        // Update position
        particle.pos.y += particle.vel.y;
        
        // Check if snowflake hits the ground
        if (particle.pos.y >= this.sim.fieldHeight - 1) {
          particle.landed = true;
          particle.vel.y = 0;
          particle.pos.y = this.sim.fieldHeight - 1;
        }
        
        // Check collision with units (freeze them!)
        const cellX = Math.floor(particle.pos.x);
        const cellY = Math.floor(particle.pos.y);
        
        // More generous collision detection - check units within 1 cell distance
        const unitsInCell = this.sim.units.filter(unit => 
          Math.abs(Math.floor(unit.pos.x) - cellX) <= 1 && 
          Math.abs(Math.floor(unit.pos.y) - cellY) <= 1 &&
          unit.hp > 0
        );
        
        unitsInCell.forEach(unit => {
          if (!unit.meta.frozen && !unit.meta.recentlySnowed) {
            // Queue freeze command
            this.sim.queuedCommands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: {
                  frozen: true,
                  frozenDuration: 60, // Longer freeze duration (7.5 seconds at 8fps)
                  brittle: true,
                  recentlySnowed: true, // Prevent multiple snowflakes from hitting same unit
                  snowFrozen: true // Mark as snow-frozen to prevent immediate thawing
                }
              }
            });
            
            // Create freeze impact particles for visual feedback
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              this.sim.particles.push({
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                vel: { 
                  x: Math.cos(angle) * 0.5, 
                  y: Math.sin(angle) * 0.5 
                },
                radius: 1,
                color: '#AADDFF', // Ice blue
                lifetime: 20,
                type: 'freeze_impact'
              });
            }
            
            // Remove the snowflake on impact
            particle.lifetime = 0;
          }
        });
      }
      
      // Clean up recently snowed flag
      if (particle.type === 'snow') {
        this.sim.units.forEach(unit => {
          if (unit.meta.recentlySnowed) {
            this.sim.queuedCommands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                meta: { recentlySnowed: false }
              }
            });
          }
        });
      }
    });
  }

  private processColdEffects(): void {
    this.sim.units.forEach(unit => {
      // Get temperature at unit's position
      const temp = this.sim.temperatureField.get(unit.pos.x, unit.pos.y);
      
      // Apply cold effects based on temperature
      if (temp <= 0) { // Freezing point
        this.applyFreezingEffects(unit);
      } else if (temp <= 5) { // Very cold
        this.applyChillEffects(unit);
      }
    });
  }

  private applyFreezingEffects(unit: Unit): void {
    // Units at 0°C or below become frozen
    if (!unit.meta.frozen) {
      // Queue freeze command
      this.sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            frozen: true,
            frozenDuration: 40, // ~5 seconds at 8fps
            brittle: true, // Frozen units are brittle - take extra damage
            stunned: true // Stunned immediately
          }
        }
      });
      
      // Also queue halt command to stop movement
      this.sim.queuedCommands.push({
        type: 'halt',
        params: { unitId: unit.id }
      });
    }
  }

  private applyChillEffects(unit: Unit): void {
    // Units in cold (but not freezing) temperatures get chilled
    const statusEffects = unit.meta.statusEffects || [];
    
    const existingChill = statusEffects.find(effect => effect.type === 'chill');
    if (!existingChill) {
      // Queue status effect command
      this.sim.queuedCommands.push({
        type: 'applyStatusEffect',
        params: {
          unitId: unit.id,
          effect: {
            type: 'chill',
            duration: 20,
            intensity: 0.3, // 30% movement reduction in cold
            source: 'winter'
          }
        }
      });
    }
  }

  private handleFrozenUnits(): void {
    this.sim.units.forEach(unit => {
      if (unit.meta.frozen) {
        const frozenDuration = (unit.meta.frozenDuration || 0) - 1;
        
        // Queue updates for frozen state
        this.sim.queuedCommands.push({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: { 
              frozenDuration,
              stunned: true
            }
          }
        });
        
        // Queue halt command to stop movement
        this.sim.queuedCommands.push({
          type: 'halt',
          params: { unitId: unit.id }
        });
        
        // Check if thawing - snow-frozen units need more time or higher temperature
        const temp = this.sim.temperatureField.get(unit.pos.x, unit.pos.y);
        const thawThreshold = unit.meta.snowFrozen ? 20 : 0; // Snow-frozen units need much warmer temps to thaw
        if (temp > thawThreshold || frozenDuration <= 0) {
          // Queue thaw command
          this.sim.queuedCommands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                frozen: false,
                brittle: false,
                stunned: false,
                snowFrozen: false,
                frozenDuration: undefined
              }
            }
          });
        }
      }
    });
  }

  // Helper method to create winter weather
  static createWinterStorm(sim: any): void {
    // Lower temperature across the field - make it much colder
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        const currentTemp = sim.temperatureField.get(x, y);
        // Drop temperature by 35 degrees, minimum -5°C  
        sim.temperatureField.set(x, y, Math.max(-5, currentTemp - 35));
      }
    }
    
    // Add winter weather flag
    sim.winterActive = true;
  }

  static endWinterStorm(sim: any): void {
    // Gradually warm up the field
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        const currentTemp = sim.temperatureField.get(x, y);
        sim.temperatureField.set(x, y, Math.min(20, currentTemp + 10));
      }
    }
    
    sim.winterActive = false;
  }
}