import { Rule } from "./rule";
import Encyclopaedia from "../dmg/encyclopaedia";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export interface SpawnRule {
  biome: string;
  creatures: string[];
  spawnRate: number;
  maxPopulation: number;
  conditions?: {
    weather?: string[];
    temperature?: { min?: number; max?: number };
    timeOfDay?: string[];
  };
  spawnLocations?: {
    type: "edge" | "random" | "near-water" | "in-trees";
    distance?: number;
  };
}

export class CreatureSpawning extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const currentBiome = this.detectBiome(context);
    const applicableRules = this.spawnRules.filter(
      (rule) => rule.biome === currentBiome || rule.biome === "any",
    );

    for (const rule of applicableRules) {
      if (this.shouldSpawn(context, rule)) {
        this.spawnCreature(context, rule);
      }
    }
    const commands: QueuedCommand[] = [];
    return commands;
  }

  private spawnRules: SpawnRule[] = [
    {
      biome: "forest",
      creatures: ["squirrel", "forest-squirrel", "bird", "deer"],
      spawnRate: 2, // 2 spawns per 100 ticks
      maxPopulation: 15,
      conditions: {
        weather: ["clear", "rain", "leaves"],
        temperature: { min: 0, max: 35 },
      },
      spawnLocations: { type: "edge", distance: 5 },
    },
    {
      biome: "desert",
      creatures: ["worm", "sand-ant", "desert-worm"],
      spawnRate: 1.5,
      maxPopulation: 20,
      conditions: {
        weather: ["clear", "sand", "sandstorm"],
        temperature: { min: 20 },
      },
      spawnLocations: { type: "random" },
    },
    {
      biome: "ice",
      creatures: ["penguin", "arctic-fox", "snow-owl"],
      spawnRate: 1,
      maxPopulation: 10,
      conditions: {
        weather: ["clear", "snow", "blizzard"],
        temperature: { max: 5 },
      },
      spawnLocations: { type: "edge", distance: 10 },
    },
    {
      biome: "swamp",
      creatures: ["frog", "firefly", "swamp-rat"],
      spawnRate: 3,
      maxPopulation: 25,
      conditions: {
        weather: ["rain", "fog", "clear"],
        temperature: { min: 10, max: 30 },
      },
      spawnLocations: { type: "near-water" },
    },
    {
      biome: "mountain",
      creatures: ["goat", "eagle", "mountain-cat"],
      spawnRate: 1.2,
      maxPopulation: 12,
      conditions: {
        weather: ["clear", "snow", "fog"],
        temperature: { min: -5, max: 25 },
      },
      spawnLocations: { type: "edge", distance: 15 },
    },
    {
      biome: "any",
      creatures: ["rabbit", "butterfly"],
      spawnRate: 0.5,
      maxPopulation: 5,
      spawnLocations: { type: "edge", distance: 3 },
    },
  ];

  private detectBiome(context: TickContext): string {
    // TODO: Need scene/biome data from context

    return "forest";
  }

  private shouldSpawn(context: TickContext, rule: SpawnRule): boolean {
    const currentPopulation = context
      .getAllUnits()
      .filter((u) => rule.creatures.includes(u.type) && u.hp > 0).length;

    if (currentPopulation >= rule.maxPopulation) {
      return false;
    }

    if (rule.conditions) {
      // TODO: Need weather and temperature data from context
    }

    const spawnProbability = rule.spawnRate / 100; // Convert to per-tick probability
    if (context.getRandom() > spawnProbability) return false;

    return true;
  }

  private spawnCreature(context: TickContext, rule: SpawnRule): void {
    const creatureType =
      rule.creatures[Math.floor(context.getRandom() * rule.creatures.length)];

    try {
      const creatureData = Encyclopaedia.unit(creatureType);
      if (!creatureData) {
        return;
      }

      const spawnPos = this.getSpawnPosition(context, rule.spawnLocations);

      const creature = {
        ...creatureData,
        id: `${creatureType}${context.getCurrentTick()}_${Math.floor(context.getRandom() * 1000)}`,
        pos: spawnPos,
        team: "neutral", // Most spawned creatures are neutral
        meta: {
          ...creatureData.meta,
          isAmbient: true,
          spawnedBy: "biome",
          spawnTick: context.getCurrentTick(),
        },
      };

      commands.push({
        type: "spawn",
        params: { unit: creature },
      });

      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: spawnPos.x * 8 + 4, y: spawnPos.y * 8 + 4 },
            vel: { x: 0, y: -0.3 },
            radius: 2,
            color: "#88FF88",
            lifetime: 20,
            type: "spawn_effect",
          },
        },
      });
    } catch (e) {}
  }

  private getSpawnPosition(
    context: TickContext,
    location?: { type: string; distance?: number },
  ): { x: number; y: number } {
    if (!location) {
      return {
        x: context.getRandom() * context.getFieldWidth(),
        y: context.getRandom() * context.getFieldHeight(),
      };
    }

    switch (location.type) {
      case "edge": {
        const distance = location.distance || 5;
        const side = Math.floor(context.getRandom() * 4); // 0=top, 1=right, 2=bottom, 3=left

        switch (side) {
          case 0:
            return {
              x: context.getRandom() * context.getFieldWidth(),
              y: distance,
            };
          case 1:
            return {
              x: context.getFieldWidth() - distance,
              y: context.getRandom() * context.getFieldHeight(),
            };
          case 2:
            return {
              x: context.getRandom() * context.getFieldWidth(),
              y: context.getFieldHeight() - distance,
            };
          case 3:
            return {
              x: distance,
              y: context.getRandom() * context.getFieldHeight(),
            };
        }
      }

      case "random":
      default:
        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getRandom() * context.getFieldHeight(),
        };

      case "near-water":
        // TODO: Need water/terrain data from context

        return {
          x: context.getFieldWidth() / 2 + (context.getRandom() - 0.5) * 10,
          y: context.getFieldHeight() / 2 + (context.getRandom() - 0.5) * 10,
        };

      case "in-trees":
        // TODO: Need tree/terrain data from context

        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getRandom() * context.getFieldHeight() * 0.3,
        };
    }
  }
}
