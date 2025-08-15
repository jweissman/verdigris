import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import type { TickContext } from '../core/tick_context';

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
  
  constructor() {
    super();
  }
  
  // Clean command factories - BiomeEffects never touches simulator
  // These just return commands for callers to execute
  static winterStormCommands(): any[] {
    return [
      { type: 'weather', params: { weatherType: 'winter' }},
      { type: 'temperature', params: { value: -5 }}
    ];
  }
  
  static endWinterCommands(): any[] {
    return [
      { type: 'weather', params: { weatherType: 'clear' }},
      { type: 'temperature', params: { value: 20 }}
    ];
  }
  
  static sandstormCommands(duration: number = 200, intensity: number = 0.8): any[] {
    return [
      { type: 'weather', params: { weatherType: 'sandstorm', duration, intensity }}
    ];
  }
  
  // Test helpers - tests have permission to mutate sim for setup
  static createWinterStorm(sim: any): void {
    sim.winterActive = true;
    if (sim.temperatureField) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        for (let y = 0; y < sim.fieldHeight; y++) {
          sim.temperatureField.set(x, y, -5);
        }
      }
    }
  }
  
  static endWinterStorm(sim: any): void {
    sim.winterActive = false;
    if (sim.temperatureField) {
      for (let x = 0; x < sim.fieldWidth; x++) {
        for (let y = 0; y < sim.fieldHeight; y++) {
          sim.temperatureField.set(x, y, 20);
        }
      }
    }
  }
  
  static triggerSandstorm(sim: any, duration: number = 200, intensity: number = 0.8): void {
    sim.sandstormActive = true;
    sim.sandstormDuration = duration;
    sim.sandstormIntensity = intensity;
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

  execute(context: TickContext): void {
    // Skip expensive biome processing in performance mode
    // if (context.isPerformanceMode()) return;
    
    // Update particle physics (snow landing, etc)
    this.updateParticlePhysics(context);
    
    // Check for winter storm flag and generate snow
    if (context.isWinterActive()) {
      // Generate snow particles during winter storm
      if (context.getCurrentTick() % 5 === 0) {
        for (let i = 0; i < 3; i++) {
          context.queueCommand({
            type: 'particle',
            params: {
              particle: {
                id: `snow_${Date.now()}_${i}`,
                type: 'snow',
                pos: { 
                  x: Math.floor(context.getRandom() * context.getFieldWidth()) * 8, 
                  y: 0 
                },
                vel: { x: 0, y: 0.15 },
                radius: 0.25,
                color: '#FFFFFF',
                lifetime: 200,
                z: 5,
                landed: false
              }
            }
          });
        }
      }
    }
    
    // Check for sandstorm and generate sand particles
    if (context.isSandstormActive()) {
      const duration = context.getSandstormDuration();
      if (duration > 0) {
        // Note: Duration countdown handled by simulator itself
        
        // Generate sand particles during sandstorm
        if (context.getCurrentTick() % 2 === 0) {
          const intensity = context.getSandstormIntensity() || 0.8;
          for (let i = 0; i < 2 * intensity; i++) {
            context.queueCommand({
              type: 'particle',
              params: {
                particle: {
                  id: `sand_${Date.now()}_${i}`,
                  type: 'sand',
                  pos: { 
                    x: -10 + context.getRandom() * 10, 
                    y: context.getRandom() * context.getFieldHeight() * 8 
                  },
                  vel: { 
                    x: 2 + context.getRandom() * 3 * intensity, 
                    y: (context.getRandom() - 0.5) * 0.5 
                  },
                  radius: 0.5 + context.getRandom() * 0.5,
                  color: '#CCAA66',
                  lifetime: 100 + context.getRandom() * 50
                }
              }
            });
          }
        }
      }
    }
    
    // Sample environmental conditions across the field
    const conditions = this.sampleEnvironmentalConditions(context);
    
    // Process each active biome
    for (const biome of this.biomes) {
      if (this.isBiomeActive(biome, conditions)) {
        this.processBiomeEffects(context, biome, conditions);
      }
    }
    
    // Update active environmental events
    this.updateEnvironmentalEvents(context);
    
    // Process temperature effects on units
    this.processTemperatureEffects(context);
    
    // Process sandstorm effects if active
    this.processSandstormEffects(context);
  }
  
  private updateParticlePhysics(context: TickContext): void {
    // Handle snow landing via update_projectile command
    // This maintains immutability - CommandHandler will process the updates
    const particles = context.getParticles();
    particles.forEach(particle => {
      if (particle.type === 'snow' && !particle.landed) {
        // Check if snowflake should land
        if (particle.pos.y >= context.getFieldHeight() - 1) {
          // Queue particle update command
          context.queueCommand({
            type: 'update_projectile',
            params: {
              id: particle.id,
              updates: {
                landed: true,
                pos: { 
                  x: particle.pos.x,
                  y: context.getFieldHeight() - 1 
                },
                vel: { x: 0, y: 0 }
              }
            }
          });
        }
      }
    });
  }
  
  private processSandstormEffects(context: TickContext): void {
    if (!context.isSandstormActive()) return;
    
    const intensity = context.getSandstormIntensity() || 0.8;
    
    // Apply sandblind to non-desert units
    context.getAllUnits().forEach(unit => {
      // Desert-adapted units are immune
      const isDesertAdapted = unit.tags?.includes('desert') || 
                             unit.type === 'grappler' || 
                             unit.type === 'waterbearer';
      
      if (!isDesertAdapted && !unit.meta.sandBlinded) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              sandBlinded: true,
              sandSlowed: true,
              accuracy: 0.3, // Severely reduced accuracy
              slowAmount: 0.5 // 50% speed reduction
            }
          }
        });
        
        // Also deal damage over time
        if (context.getCurrentTick() % 10 === 0) {
          context.queueCommand({
            type: 'damage',
            params: {
              targetId: unit.id,
              amount: Math.floor(2 * intensity),
              aspect: 'physical'
            }
          });
        }
      }
    });
  }
  
  private processTemperatureEffects(context: TickContext): void {
    const units = context.getAllUnits();
    if (units.length === 0) return;
    
    units.forEach(unit => {
      const temp = context.getTemperatureAt(Math.floor(unit.pos.x), Math.floor(unit.pos.y));
      
      // Freeze units in sub-zero temperatures  
      if (temp <= 0 && !unit.meta.frozen) {
        const metaUpdate = {
          frozen: true,
          frozenDuration: 40,
          brittle: true,
          stunned: true
        };
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: metaUpdate
          }
        });
        
        // Halt movement
        context.queueCommand({
          type: 'halt',
          params: { unitId: unit.id }
        });
        
        // Create freeze visual effect
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          context.queueCommand({
            type: 'particle',
            params: {
              particle: {
                id: `freeze_${Date.now()}_${i}`,
                type: 'freeze_impact',
                pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
                vel: { 
                  x: Math.cos(angle) * 0.5, 
                  y: Math.sin(angle) * 0.5
                },
                radius: 1,
                color: '#AADDFF',
                lifetime: 20
              }
            }
          });
        }
      }
      // Chill units in cold temperatures
      else if (temp > 0 && temp <= 5 && !unit.meta.chilled) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chilledDuration: 20,
              slowAmount: 0.5
            }
          }
        });
      }
      // Thaw frozen units if temperature rises
      else if (temp > 0 && unit.meta.frozen) {
        context.queueCommand({
          type: 'meta',
          params: {
            unitId: unit.id,
            meta: {
              frozen: false,
              brittle: false,
              stunned: false
            }
          }
        });
      }
    });
  }

  private sampleEnvironmentalConditions(context: TickContext) {
    // Sample key points across the field for efficiency
    const samples: Array<{pos: Vec2, temp: number, humidity?: number}> = [];
    
    for (let x = 0; x < context.getFieldWidth(); x += 4) {
      for (let y = 0; y < context.getFieldHeight(); y += 4) {
        // Note: TickContext doesn't expose temperature/humidity fields directly
        // We'll use default values for now, or derive from unit metadata
        const temp = this.getTemperatureAtPosition(context, x, y);
        const humidity = this.getHumidityAtPosition(context, x, y);
        samples.push({ pos: {x, y}, temp, humidity });
      }
    }
    
    return samples;
  }
  
  private getTemperatureAtPosition(context: TickContext, x: number, y: number): number {
    // Check for units with temperature effects nearby
    const nearbyUnits = context.getAllUnits().filter(unit => 
      Math.abs(unit.pos.x - x) <= 2 && Math.abs(unit.pos.y - y) <= 2
    );
    
    let baseTemp = 20; // Default temperature
    
    for (const unit of nearbyUnits) {
      if (unit.meta?.temperature) {
        baseTemp = unit.meta.temperature;
      } else if (unit.meta?.winterActive) {
        baseTemp = -5;
      } else if (unit.meta?.desertActive) {
        baseTemp = 35;
      }
    }
    
    return baseTemp;
  }
  
  private getHumidityAtPosition(context: TickContext, x: number, y: number): number {
    // Similar logic for humidity
    const nearbyUnits = context.getAllUnits().filter(unit => 
      Math.abs(unit.pos.x - x) <= 2 && Math.abs(unit.pos.y - y) <= 2
    );
    
    let baseHumidity = 0.5; // Default humidity
    
    for (const unit of nearbyUnits) {
      if (unit.meta?.humidity) {
        baseHumidity = unit.meta.humidity;
      } else if (unit.meta?.desertActive) {
        baseHumidity = 0.1;
      }
    }
    
    return baseHumidity;
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

  private processBiomeEffects(context: TickContext, biome: BiomeConfig, conditions: any[]): void {
    // Add particles
    if (biome.particles && context.getCurrentTick() % biome.particles.frequency === 0) {
      this.addBiomeParticles(context, biome, conditions);
    }
    
    // Apply status effects to units
    if (biome.statusEffects) {
      this.applyBiomeStatusEffects(context, biome, conditions);
    }
    
    // Trigger environmental events
    if (biome.events) {
      this.processBiomeEvents(context, biome);
    }
  }

  private addBiomeParticles(context: TickContext, biome: BiomeConfig, conditions: any[]): void {
    const { particles } = biome;
    if (!particles) return;

    for (let i = 0; i < particles.count; i++) {
      // Choose spawn location based on biome activity
      const activeAreas = conditions.filter(c => 
        c.temp >= biome.temperatureRange[0] && 
        c.temp <= biome.temperatureRange[1]
      );
      
      if (activeAreas.length === 0) continue;
      
      const area = activeAreas[Math.floor(context.getRandom() * activeAreas.length)];
      const x = area.pos.x + (context.getRandom() - 0.5) * 8; // Spread around sample point
      const y = particles.type === 'snow' ? 0 : area.pos.y;
      
      context.queueEvent({
        kind: 'particle',
        meta: {
          pos: { x: Math.max(0, Math.min(context.getFieldWidth() - 1, x)), y },
          vel: particles.properties.vel,
          radius: particles.properties.radius,
          lifetime: particles.properties.lifetime,
          color: particles.color,
          z: particles.properties.z,
          type: particles.type,
          ...particles.properties
        }
      });
    }
  }

  private applyBiomeStatusEffects(context: TickContext, biome: BiomeConfig, conditions: any[]): void {
    for (const unit of context.getAllUnits()) {
      if (unit.state === 'dead') continue;
      
      // Sample environment at unit position
      const temp = this.getTemperatureAtPosition(context, unit.pos.x, unit.pos.y);
      const humidity = this.getHumidityAtPosition(context, unit.pos.x, unit.pos.y);
      
      for (const effect of biome.statusEffects!) {
        if (effect.condition(temp, humidity)) {
          this.applyStatusEffect(context, unit, effect);
        }
      }
    }
  }

  private applyStatusEffect(context: TickContext, unit: Unit, effect: any): void {
    // Unified status effect application
    switch (effect.effectType) {
      case 'freeze':
        if (!unit.meta.frozen && context.getRandom() < effect.intensity) {
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
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
        if (context.getCurrentTick() % 8 === 0) { // Every second
          context.queueCommand({
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

  private processBiomeEvents(context: TickContext, biome: BiomeConfig): void {
    for (const event of biome.events!) {
      const eventKey = `${biome.name}_${event.type}`;
      
      if (!this.activeEvents.has(eventKey)) {
        // Check for event trigger
        if (context.getRandom() < event.triggerChance) {
          const duration = event.duration[0] + 
            Math.floor(context.getRandom() * (event.duration[1] - event.duration[0]));
          
          this.activeEvents.set(eventKey, {
            type: event.type,
            duration,
            effects: event.effects,
            startTick: context.getCurrentTick()
          });
        }
      }
    }
  }

  private updateEnvironmentalEvents(context: TickContext): void {
    for (const [key, event] of this.activeEvents.entries()) {
      const elapsed = context.getCurrentTick() - event.startTick;
      
      if (elapsed >= event.duration) {
        this.activeEvents.delete(key);
        continue;
      }
      
      // Apply event effects
      this.applyEventEffects(context, event);
    }
  }

  private applyEventEffects(context: TickContext, event: any): void {
    if (event.type === 'sandstorm') {
      // Add extra particles
      if (context.getCurrentTick() % 2 === 0) {
        for (let i = 0; i < event.effects.particleBoost; i++) {
          context.queueEvent({
            kind: 'particle',
            meta: {
              pos: { 
                x: context.getRandom() * context.getFieldWidth(), 
                y: context.getRandom() * context.getFieldHeight() 
              },
              vel: { x: (context.getRandom() - 0.5) * 2, y: 0 },
              radius: 0.3,
              lifetime: 60,
              color: '#D2B48C',
              z: 2,
              type: 'sand'
            }
          });
        }
      }
      
      // Apply periodic damage
      if (context.getCurrentTick() % 40 === 0 && context.getRandom() < 0.2) {
        for (const unit of context.getAllUnits()) {
          if (unit.state !== 'dead' && context.getRandom() < 0.3) {
            context.queueEvent({
              kind: 'damage',
              target: unit.id,
              meta: {
                amount: event.effects.damage,
                source: 'sandstorm'
              }
            });
          }
        }
      }
    }
  }
}