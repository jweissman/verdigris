import { Rule } from './rule';
import Encyclopaedia from '../dmg/encyclopaedia';
import type { TickContext } from "../core/tick_context";

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
  execute(context: TickContext): void {
    // Check spawn rules based on biome
    const currentBiome = this.detectBiome(context);
    const applicableRules = this.spawnRules.filter(rule => 
      rule.biome === currentBiome || rule.biome === 'any'
    );

    for (const rule of applicableRules) {
      if (this.shouldSpawn(context, rule)) {
        this.spawnCreature(context, rule);
      }
    }
  }

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
      biome: 'ice',
      creatures: ['penguin', 'arctic-fox', 'snow-owl'],
      spawnRate: 1,
      maxPopulation: 10,
      conditions: {
        weather: ['clear', 'snow', 'blizzard'],
        temperature: { max: 5 }
      },
      spawnLocations: { type: 'edge', distance: 10 }
    },
    {
      biome: 'swamp',
      creatures: ['frog', 'firefly', 'swamp-rat'],
      spawnRate: 3,
      maxPopulation: 25,
      conditions: {
        weather: ['rain', 'fog', 'clear'],
        temperature: { min: 10, max: 30 }
      },
      spawnLocations: { type: 'near-water' }
    },
    {
      biome: 'mountain',
      creatures: ['goat', 'eagle', 'mountain-cat'],
      spawnRate: 1.2,
      maxPopulation: 12,
      conditions: {
        weather: ['clear', 'snow', 'fog'],
        temperature: { min: -5, max: 25 }
      },
      spawnLocations: { type: 'edge', distance: 15 }
    },
    {
      biome: 'any',
      creatures: ['rabbit', 'butterfly'],
      spawnRate: 0.5,
      maxPopulation: 5,
      spawnLocations: { type: 'edge', distance: 3 }
    }
  ];

  private detectBiome(context: TickContext): string {
    // TODO: Need scene/biome data from context
    // For now, return default biome
    return 'forest';
  }

  private shouldSpawn(context: TickContext, rule: SpawnRule): boolean {
    // Check population limit
    const currentPopulation = context.getAllUnits().filter(u => 
      rule.creatures.includes(u.type) && u.hp > 0
    ).length;
    
    if (currentPopulation >= rule.maxPopulation) {
      return false;
    }

    // Check conditions
    if (rule.conditions) {
      // TODO: Need weather and temperature data from context
      // For now, assume conditions are met
    }

    // Check spawn rate (probability per tick)
    const spawnProbability = rule.spawnRate / 100; // Convert to per-tick probability
    if (context.getRandom() > spawnProbability) return false;

    return true;
  }

  private spawnCreature(context: TickContext, rule: SpawnRule): void {
    // Select a creature type from the rule
    const creatureType = rule.creatures[Math.floor(context.getRandom() * rule.creatures.length)];
    
    // Get creature data from encyclopedia
    try {
      const creatureData = Encyclopaedia.unit(creatureType);
      if (!creatureData) {
        return;
      }

      // Determine spawn position based on rule
      const spawnPos = this.getSpawnPosition(context, rule.spawnLocations);
      
      // Create creature with ambient behavior
      const creature = {
        ...creatureData,
        id: `${creatureType}${context.getCurrentTick()}_${Math.floor(context.getRandom() * 1000)}`,
        pos: spawnPos,
        team: 'neutral', // Most spawned creatures are neutral
        meta: {
          ...creatureData.meta,
          isAmbient: true,
          spawnedBy: 'biome',
          spawnTick: context.getCurrentTick()
        }
      };

      // Queue spawn command
      context.queueCommand({
        type: 'spawn',
        params: { unit: creature }
      });

      // Add spawn effect
      context.queueCommand({
        type: 'particle',
        params: {
          particle: {
            pos: { x: spawnPos.x * 8 + 4, y: spawnPos.y * 8 + 4 },
            vel: { x: 0, y: -0.3 },
            radius: 2,
            color: '#88FF88',
            lifetime: 20,
            type: 'spawn_effect'
          }
        }
      });
      
    } catch (e) {
      // Silently fail if creature type doesn't exist
    }
  }

  private getSpawnPosition(context: TickContext, location?: { type: string; distance?: number }): { x: number; y: number } {
    if (!location) {
      // Default to random position
      return {
        x: context.getRandom() * context.getFieldWidth(),
        y: context.getRandom() * context.getFieldHeight()
      };
    }

    switch (location.type) {
      case 'edge': {
        const distance = location.distance || 5;
        const side = Math.floor(context.getRandom() * 4); // 0=top, 1=right, 2=bottom, 3=left
        
        switch (side) {
          case 0: // top
            return { x: context.getRandom() * context.getFieldWidth(), y: distance };
          case 1: // right
            return { x: context.getFieldWidth() - distance, y: context.getRandom() * context.getFieldHeight() };
          case 2: // bottom
            return { x: context.getRandom() * context.getFieldWidth(), y: context.getFieldHeight() - distance };
          case 3: // left
            return { x: distance, y: context.getRandom() * context.getFieldHeight() };
        }
      }
      
      case 'random':
      default:
        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getRandom() * context.getFieldHeight()
        };
        
      case 'near-water':
        // TODO: Need water/terrain data from context
        // For now, use random position near center
        return {
          x: context.getFieldWidth() / 2 + (context.getRandom() - 0.5) * 10,
          y: context.getFieldHeight() / 2 + (context.getRandom() - 0.5) * 10
        };
        
      case 'in-trees':
        // TODO: Need tree/terrain data from context
        // For now, use random position in upper area
        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getRandom() * context.getFieldHeight() * 0.3
        };
    }
    
    // Fallback
    return {
      x: context.getRandom() * context.getFieldWidth(),
      y: context.getRandom() * context.getFieldHeight()
    };
  }
}