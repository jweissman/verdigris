import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";

interface BiomeConfig {
  name: string;
  
  // Environmental thresholds
  temperatureRange: [number, number]; // [min, max] for this biome
  humidityRange?: [number, number];
  
  // Particle effects
  particles?: {
    type: string;
    color: string;
    frequency: number; // every N ticks
    count: number;     // particles per spawn
    properties: any;   // type-specific properties
  };
  
  // Status effects applied to units
  statusEffects?: {
    condition: (temp: number, humidity?: number) => boolean;
    effectType: string;
    intensity: number;
    duration?: number;
  }[];
  
  // Environmental events (sandstorms, blizzards, etc.)
  events?: {
    type: string;
    triggerChance: number;
    duration: [number, number];
    effects: any;
  }[];
}

/**
 * Unified biome effects system replacing WinterEffects and DesertEffects
 * Uses scalar fields and configurable biome definitions
 */
export class BiomeEffects extends Rule {
  private activeEvents: Map<string, any> = new Map();
  
  // Compatibility methods for existing winter effects API
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
  
  // Biome configurations - could be loaded from JSON
  private biomes: BiomeConfig[] = [
    {
      name: 'winter',
      temperatureRange: [-20, 5],
      humidityRange: [0.0, 1.0], // Allow any humidity for winter
      particles: {
        type: 'snow',
        color: '#FFFFFF',
        frequency: 5,
        count: 3,
        properties: {
          vel: { x: 0, y: 0.15 },
          radius: 0.25,
          lifetime: 200,
          z: 5
        }
      },
      statusEffects: [
        {
          condition: (temp) => temp < 0,
          effectType: 'freeze',
          intensity: 0.8,
          duration: 60
        }
      ]
    },
    {
      name: 'desert',
      temperatureRange: [25, 50],
      humidityRange: [0.0, 0.3],
      particles: {
        type: 'heat_shimmer',
        color: '#FFA500',
        frequency: 3,
        count: 8,
        properties: {
          vel: { x: 0, y: -0.1 },
          radius: 0.15,
          lifetime: 150,
          z: 3
        }
      },
      statusEffects: [
        {
          condition: (temp) => temp > 35,
          effectType: 'heat_stress',
          intensity: 0.2,
          duration: 40
        }
      ],
      events: [
        {
          type: 'sandstorm',
          triggerChance: 0.001, // 0.1% per tick
          duration: [100, 300],
          effects: {
            visibility: 0.5,
            damage: 2,
            particleBoost: 5
          }
        }
      ]
    }
  ];

  apply = (): void => {
    // Skip expensive biome processing in performance mode
    if (this.sim.performanceMode) return;
    
    // Sample environmental conditions across the field
    const conditions = this.sampleEnvironmentalConditions();
    
    // Process each active biome
    for (const biome of this.biomes) {
      if (this.isBiomeActive(biome, conditions)) {
        this.processBiomeEffects(biome, conditions);
      }
    }
    
    // Update active environmental events
    this.updateEnvironmentalEvents();
  }

  private sampleEnvironmentalConditions() {
    // Sample key points across the field for efficiency
    const samples: Array<{pos: Vec2, temp: number, humidity?: number}> = [];
    
    for (let x = 0; x < this.sim.fieldWidth; x += 4) {
      for (let y = 0; y < this.sim.fieldHeight; y += 4) {
        const temp = this.sim.temperatureField?.get(x, y) ?? 20;
        const humidity = this.sim.humidityField?.get(x, y) ?? 0.5;
        samples.push({ pos: {x, y}, temp, humidity });
      }
    }
    
    
    return samples;
  }

  private isBiomeActive(biome: BiomeConfig, conditions: any[]): boolean {
    // Check if any sample point matches this biome's conditions
    const isActive = conditions.some(sample => {
      const tempMatch = sample.temp >= biome.temperatureRange[0] && 
                       sample.temp <= biome.temperatureRange[1];
      
      if (!biome.humidityRange) return tempMatch;
      
      const humidityMatch = sample.humidity >= biome.humidityRange[0] && 
                           sample.humidity <= biome.humidityRange[1];
      
      return tempMatch && humidityMatch;
    });
    
    
    return isActive;
  }

  private processBiomeEffects(biome: BiomeConfig, conditions: any[]): void {
    // Add particles
    if (biome.particles && this.sim.ticks % biome.particles.frequency === 0) {
      this.addBiomeParticles(biome, conditions);
    }
    
    // Apply status effects to units
    if (biome.statusEffects) {
      this.applyBiomeStatusEffects(biome, conditions);
    }
    
    // Trigger environmental events
    if (biome.events) {
      this.processBiomeEvents(biome);
    }
  }

  private addBiomeParticles(biome: BiomeConfig, conditions: any[]): void {
    const { particles } = biome;
    if (!particles) return;


    for (let i = 0; i < particles.count; i++) {
      // Choose spawn location based on biome activity
      const activeAreas = conditions.filter(c => 
        c.temp >= biome.temperatureRange[0] && 
        c.temp <= biome.temperatureRange[1]
      );
      
      if (activeAreas.length === 0) continue;
      
      const area = activeAreas[Math.floor(this.rng.random() * activeAreas.length)];
      const x = area.pos.x + (this.rng.random() - 0.5) * 8; // Spread around sample point
      const y = particles.type === 'snow' ? 0 : area.pos.y;
      
      this.sim.particles.push({
        pos: { x: Math.max(0, Math.min(this.sim.fieldWidth - 1, x)), y },
        vel: particles.properties.vel,
        radius: particles.properties.radius,
        lifetime: particles.properties.lifetime,
        color: particles.color,
        z: particles.properties.z,
        type: particles.type,
        ...particles.properties
      });
    }
  }

  private applyBiomeStatusEffects(biome: BiomeConfig, conditions: any[]): void {
    for (const unit of this.sim.units) {
      if (unit.state === 'dead') continue;
      
      // Sample environment at unit position
      const temp = this.sim.temperatureField?.get(unit.pos.x, unit.pos.y) ?? 20;
      const humidity = this.sim.humidityField?.get(unit.pos.x, unit.pos.y) ?? 0.5;
      
      for (const effect of biome.statusEffects!) {
        if (effect.condition(temp, humidity)) {
          this.applyStatusEffect(unit, effect);
        }
      }
    }
  }

  private applyStatusEffect(unit: Unit, effect: any): void {
    // Unified status effect application
    switch (effect.effectType) {
      case 'freeze':
        if (!unit.meta.frozen && this.rng.random() < effect.intensity) {
          this.sim.queuedCommands.push({
            type: 'meta',
            params: {
              unitId: unit.id,
              updates: {
                frozen: true,
                frozenDuration: effect.duration || 60,
                brittle: true,
                stunned: true
              }
            }
          });
        }
        break;
        
      case 'heat_stress':
        if (this.sim.ticks % 8 === 0) { // Every second
          this.sim.queuedCommands.push({
            type: 'applyStatusEffect',
            params: {
              unitId: unit.id,
              effectType: 'heat_stress',
              duration: effect.duration || 40,
              intensity: effect.intensity,
              source: 'desert_heat'
            }
          });
        }
        break;
    }
  }

  private processBiomeEvents(biome: BiomeConfig): void {
    for (const event of biome.events!) {
      const eventKey = `${biome.name}_${event.type}`;
      
      if (!this.activeEvents.has(eventKey)) {
        // Check for event trigger
        if (this.rng.random() < event.triggerChance) {
          const duration = event.duration[0] + 
            Math.floor(this.rng.random() * (event.duration[1] - event.duration[0]));
          
          this.activeEvents.set(eventKey, {
            type: event.type,
            duration,
            effects: event.effects,
            startTick: this.sim.ticks
          });
        }
      }
    }
  }

  private updateEnvironmentalEvents(): void {
    for (const [key, event] of this.activeEvents.entries()) {
      const elapsed = this.sim.ticks - event.startTick;
      
      if (elapsed >= event.duration) {
        this.activeEvents.delete(key);
        continue;
      }
      
      // Apply event effects
      this.applyEventEffects(event);
    }
  }

  private applyEventEffects(event: any): void {
    if (event.type === 'sandstorm') {
      // Add extra particles
      if (this.sim.ticks % 2 === 0) {
        for (let i = 0; i < event.effects.particleBoost; i++) {
          this.sim.particles.push({
            pos: { 
              x: this.rng.random() * this.sim.fieldWidth, 
              y: this.rng.random() * this.sim.fieldHeight 
            },
            vel: { x: (this.rng.random() - 0.5) * 2, y: 0 },
            radius: 0.3,
            lifetime: 60,
            color: '#D2B48C',
            z: 2,
            type: 'sand'
          });
        }
      }
      
      // Apply periodic damage
      if (this.sim.ticks % 40 === 0 && this.rng.random() < 0.2) {
        for (const unit of this.sim.units) {
          if (unit.state !== 'dead' && this.rng.random() < 0.3) {
            this.sim.queuedEvents.push({
              kind: 'damage',
              target: unit.id,
              amount: event.effects.damage,
              source: 'sandstorm'
            });
          }
        }
      }
    }
  }
}