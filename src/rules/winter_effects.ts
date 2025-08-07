import { Rule } from "./rule";
import { Unit, Vec2 } from "../sim/types";

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
      for (let i = 0; i < 1; i++) {
        // Spawn at random X position at top of field
        const x = Math.floor(Math.random() * this.sim.fieldWidth);
        const y = 0; // Start at top
        
        this.sim.particles.push({
          pos: { x, y },
          vel: { x: 0, y: 0.15 }, // Pure vertical fall, even slower for visibility
          radius: 0.25, // Truly single pixel
          lifetime: 300, // Longer lifetime to cross field slowly
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
          console.log(`❄️ Snowflake landed at cell (${Math.floor(particle.pos.x)}, ${Math.floor(particle.pos.y)})`);
        }
        
        // Check collision with units (freeze them!)
        const cellX = Math.floor(particle.pos.x);
        const cellY = Math.floor(particle.pos.y);
        
        const unitsInCell = this.sim.units.filter(unit => 
          Math.floor(unit.pos.x) === cellX && 
          Math.floor(unit.pos.y) === cellY &&
          unit.hp > 0
        );
        
        unitsInCell.forEach(unit => {
          if (!unit.meta.frozen && !unit.meta.recentlySnowed) {
            console.log(`❄️ Snowflake hits ${unit.id}! Instant freeze!`);
            unit.meta.frozen = true;
            unit.meta.frozenDuration = 30;
            unit.meta.brittle = true;
            unit.meta.recentlySnowed = true; // Prevent multiple snowflakes from hitting same unit
            
            // Remove the snowflake on impact
            particle.lifetime = 0;
          }
        });
      }
      
      // Clean up recently snowed flag
      if (particle.type === 'snow') {
        this.sim.units.forEach(unit => {
          if (unit.meta.recentlySnowed) {
            unit.meta.recentlySnowed = false;
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
      console.log(`${unit.id} is frozen solid!`);
      unit.meta.frozen = true;
      unit.meta.frozenDuration = 40; // ~5 seconds at 8fps
      
      // Frozen units are brittle - take extra damage
      unit.meta.brittle = true;
    }
  }

  private applyChillEffects(unit: Unit): void {
    // Units in cold (but not freezing) temperatures get chilled
    if (!unit.meta.statusEffects) {
      unit.meta.statusEffects = [];
    }
    
    const existingChill = unit.meta.statusEffects.find(effect => effect.type === 'chill');
    if (!existingChill) {
      unit.meta.statusEffects.push({
        type: 'chill',
        duration: 20,
        intensity: 0.3, // 30% movement reduction in cold
        source: 'winter'
      });
    }
  }

  private handleFrozenUnits(): void {
    this.sim.units.forEach(unit => {
      if (unit.meta.frozen) {
        // Reduce frozen duration
        unit.meta.frozenDuration = (unit.meta.frozenDuration || 0) - 1;
        
        // Frozen units cannot move or act
        unit.meta.stunned = true;
        unit.intendedMove = { x: 0, y: 0 };
        
        // Check if thawing
        const temp = this.sim.temperatureField.get(unit.pos.x, unit.pos.y);
        if (temp > 0 || unit.meta.frozenDuration <= 0) {
          console.log(`${unit.id} thaws out!`);
          unit.meta.frozen = false;
          unit.meta.brittle = false;
          unit.meta.stunned = false;
          delete unit.meta.frozenDuration;
        }
      }
    });
  }

  // Helper method to create winter weather
  static createWinterStorm(sim: any): void {
    // Lower temperature across the field
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        const currentTemp = sim.temperatureField.get(x, y);
        sim.temperatureField.set(x, y, Math.max(-5, currentTemp - 15));
      }
    }
    
    // Add winter weather flag
    sim.winterActive = true;
    console.log('Winter storm begins! Temperature drops across the battlefield.');
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
    console.log('Winter storm subsides. The battlefield warms.');
  }
}