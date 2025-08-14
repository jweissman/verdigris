import { Rule } from './rule';
import { Simulator } from '../core/simulator';
import Encyclopaedia from '../dmg/encyclopaedia';

export interface SpawnRule {
  biome: string;
  creatures: string[];
  spawnRate: number; // spawns per 100 ticks
  maxPopulation: number;
  conditions?: {
    weather?: string[];
    temperature?: { min?: number; max?: number };
    timeOfDay?: string[];
  };
  spawnLocations?: {
    type: 'edge' | 'random' | 'near-water' | 'in-trees';
    distance?: number;
  };
}

export class CreatureSpawning extends Rule {
  private spawnRules: SpawnRule[] = [
    {
      biome: 'forest',
      creatures: ['squirrel', 'forest-squirrel', 'bird', 'deer'],
      spawnRate: 2, // 2 spawns per 100 ticks
      maxPopulation: 15,
      conditions: {
        weather: ['clear', 'rain', 'leaves'],
        temperature: { min: 0, max: 35 }
      },
      spawnLocations: { type: 'edge', distance: 5 }
    },
    {
      biome: 'desert',
      creatures: ['worm', 'sand-ant', 'desert-worm'],
      spawnRate: 1.5,
      maxPopulation: 20,
      conditions: {
        weather: ['clear', 'sand', 'sandstorm'],
        temperature: { min: 20 }
      },
      spawnLocations: { type: 'random' }
    },
    {
      biome: 'volcanic',
      creatures: ['demon', 'salamander', 'fire-elemental'],
      spawnRate: 3,
      maxPopulation: 10,
      conditions: {
        weather: ['clear', 'ashfall'],
        temperature: { min: 40 }
      },
      spawnLocations: { type: 'near-lava' }
    },
    {
      biome: 'arctic',
      creatures: ['frost-wolf', 'ice-bear', 'penguin'],
      spawnRate: 1,
      maxPopulation: 8,
      conditions: {
        weather: ['clear', 'blizzard', 'snow'],
        temperature: { max: 0 }
      },
      spawnLocations: { type: 'edge' }
    }
  ];

  private lastSpawnTick: number = 0;
  private spawnCooldown: number = 50; // minimum ticks between spawns

  apply(): void {
    // Only try to spawn every spawnCooldown ticks
    if (this.sim.ticks - this.lastSpawnTick < this.spawnCooldown) {
      return;
    }

    const currentBiome = this.getCurrentBiome();
    const currentWeather = this.getCurrentWeather();
    const currentTemp = this.getCurrentTemperature();

    // Find applicable spawn rules
    const applicableRules = this.spawnRules.filter(rule => 
      this.isRuleApplicable(rule, currentBiome, currentWeather, currentTemp)
    );

    for (const rule of applicableRules) {
      this.trySpawnFromRule(rule, currentBiome);
    }

    this.lastSpawnTick = this.sim.ticks;
  }

  private isRuleApplicable(rule: SpawnRule, biome: string, weather: string, temp: number): boolean {
    // Check biome
    if (rule.biome !== biome) return false;

    // Check population limit
    const currentPopulation = this.sim.units.filter(u => 
      rule.creatures.includes(u.type) && u.hp > 0
    ).length;
    if (currentPopulation >= rule.maxPopulation) return false;

    // Check weather conditions
    if (rule.conditions?.weather && !rule.conditions.weather.includes(weather)) {
      return false;
    }

    // Check temperature conditions
    if (rule.conditions?.temperature) {
      const tempCondition = rule.conditions.temperature;
      if (tempCondition.min !== undefined && temp < tempCondition.min) return false;
      if (tempCondition.max !== undefined && temp > tempCondition.max) return false;
    }

    return true;
  }

  private trySpawnFromRule(rule: SpawnRule, biome: string): void {
    // Calculate spawn probability based on rate
    const spawnProbability = rule.spawnRate / 100;
    if (Math.random() > spawnProbability) return;

    // Choose random creature from rule
    const creatureType = rule.creatures[Math.floor(Math.random() * rule.creatures.length)];
    
    // Get spawn location
    const spawnPos = this.getSpawnLocation(rule.spawnLocations);
    if (!spawnPos) return;

    // Create the creature
    this.spawnCreature(creatureType, spawnPos.x, spawnPos.y, biome);
  }

  private getSpawnLocation(locationRule?: SpawnRule['spawnLocations']): { x: number; y: number } | null {
    if (!locationRule || locationRule.type === 'random') {
      return {
        x: Math.random() * this.sim.width,
        y: Math.random() * this.sim.height
      };
    }

    if (locationRule.type === 'edge') {
      const distance = locationRule.distance || 3;
      const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      
      switch (side) {
        case 0: // top
          return { x: Math.random() * this.sim.width, y: distance };
        case 1: // right
          return { x: this.sim.width - distance, y: Math.random() * this.sim.height };
        case 2: // bottom
          return { x: Math.random() * this.sim.width, y: this.sim.height - distance };
        case 3: // left
          return { x: distance, y: Math.random() * this.sim.height };
      }
    }

    // Default to random if location type not implemented
    return {
      x: Math.random() * this.sim.width,
      y: Math.random() * this.sim.height
    };
  }

  private spawnCreature(creatureType: string, x: number, y: number, biome: string): void {
    try {
      const creatureData = Encyclopaedia.unit(creatureType);
      if (!creatureData) {
        console.warn(`CreatureSpawning: Unknown creature type "${creatureType}"`);
        return;
      }

      // Create unit with spawn location
      const spawnedUnit = {
        ...creatureData,
        pos: { x, y },
        id: `${creatureType}${this.sim.ticks}_${Math.floor(Math.random() * 1000)}`,
        meta: {
          ...creatureData.meta,
          spawned: true,
          spawnTick: this.sim.ticks,
          spawnBiome: biome
        }
      };

      // Add some spawn effects for dramatic flair
      this.sim.queuedCommands.push({
        type: 'spawn',
        params: { unit: spawnedUnit }
      });

      // Add visual spawn effect
      this.sim.queuedCommands.push({
        type: 'effect',
        params: {
          type: 'spawn-flash',
          x: x,
          y: y,
          color: this.getSpawnEffectColor(biome)
        }
      });

    } catch (e) {
      console.warn(`CreatureSpawning: Failed to spawn ${creatureType}:`, e);
    }
  }

  private getSpawnEffectColor(biome: string): string {
    switch (biome) {
      case 'forest': return '#00FF00';
      case 'desert': return '#FFD700';
      case 'volcanic': return '#FF4500';
      case 'arctic': return '#87CEEB';
      default: return '#FFFFFF';
    }
  }

  private getCurrentBiome(): string {
    // Try to get biome from scene background
    const background = (this.sim as any).sceneBackground || (this.sim as any).background;
    if (background) {
      if (background.includes('forest')) return 'forest';
      if (background.includes('desert')) return 'desert';
      if (background.includes('volcanic') || background.includes('lava')) return 'volcanic';
      if (background.includes('arctic') || background.includes('ice')) return 'arctic';
    }
    
    // Default based on existing units
    const forestCreatures = this.sim.units.filter(u => 
      ['squirrel', 'forest-squirrel', 'deer', 'bird', 'tracker'].includes(u.type)
    ).length;
    const desertCreatures = this.sim.units.filter(u => 
      ['worm', 'sand-ant', 'desert-worm'].includes(u.type)
    ).length;
    
    if (forestCreatures > desertCreatures) return 'forest';
    if (desertCreatures > 0) return 'desert';
    
    return 'forest'; // default
  }

  private getCurrentWeather(): string {
    // Get weather from simulator state
    return (this.sim as any).currentWeather || 'clear';
  }

  private getCurrentTemperature(): number {
    // Get temperature from simulator state
    return (this.sim as any).currentTemperature || 20;
  }

  // Public method to add custom spawn rules
  addSpawnRule(rule: SpawnRule): void {
    this.spawnRules.push(rule);
  }

  // Public method to modify spawn rates (for events, etc.)
  modifySpawnRate(biome: string, multiplier: number): void {
    this.spawnRules.forEach(rule => {
      if (rule.biome === biome) {
        rule.spawnRate *= multiplier;
      }
    });
  }
}