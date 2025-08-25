import { Rule } from "./rule";
import Encyclopaedia from "../dmg/encyclopaedia";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class AmbientSpawning extends Rule {
  private lastSpawnTick = 0;
  private spawnInterval = 100;

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    if (context.getCurrentTick() - this.lastSpawnTick < this.spawnInterval)
      return commands;

    const allUnits = context.getAllUnits();
    const teams = new Set(allUnits.filter((u) => u.hp > 0).map((u) => u.team));
    if (teams.has("friendly") && teams.has("hostile")) {
      return commands; // Active combat, don't spawn ambient creatures
    }

    if (allUnits.length > 20) {
      return commands; // Too many units, probably a test
    }

    const biome = this.detectBiome(context);
    const cuteAnimals = this.getCuteAnimalsForBiome(biome);

    if (cuteAnimals.length === 0) {
      return commands;
    }

    const currentCuteCount = context
      .getAllUnits()
      .filter((u) => cuteAnimals.includes(u.type) && u.hp > 0).length;

    if (currentCuteCount < 10) {
      this.spawnCuteAnimal(context, cuteAnimals, biome, commands);
    }

    this.lastSpawnTick = context.getCurrentTick();
    return commands;
  }

  private detectBiome(context: TickContext): string {
    const background = context.getSceneBackground();

    if (background.includes("desert") || background.includes("sand")) {
      return "desert";
    } else if (
      background.includes("snow") ||
      background.includes("arctic") ||
      background.includes("winter")
    ) {
      return "arctic";
    } else if (background.includes("forest") || background.includes("tree")) {
      return "forest";
    } else if (
      background.includes("arena") ||
      background.includes("test") ||
      background.includes("battle")
    ) {
      return "none"; // No ambient spawning for test/battle scenes
    }

    return "forest";
  }

  private getCuteAnimalsForBiome(biome: string): string[] {
    switch (biome) {
      case "forest":
        return ["squirrel", "forest-squirrel"];
      case "desert":
        return ["sand-ant"];
      case "arctic":
        return ["penguin"];
      case "none":
        return []; // No spawning for test/battle scenes
      default:
        return ["squirrel"];
    }
  }

  private spawnCuteAnimal(
    context: TickContext,
    animalTypes: string[],
    biome: string,
    commands: QueuedCommand[],
  ): void {
    const animalType =
      animalTypes[Math.floor(context.getRandom() * animalTypes.length)];

    try {
      const animalData = Encyclopaedia.unit(animalType);
      if (!animalData) return;

      const spawnPos = this.getEdgeSpawnPosition(context);

      const cuteAnimal = {
        ...animalData,
        id: `${animalType}_${context.getCurrentTick()}_${Math.floor(context.getRandom() * 1000)}`,
        pos: spawnPos,
        team: "neutral",
        tags: [...(animalData.tags || []), "wander"],
        meta: {
          ...animalData.meta,
          isAmbient: true,
          spawnTick: context.getCurrentTick(),
          wanderTarget: this.getRandomWanderTarget(context),
        },
      };

      commands.push({
        type: "spawn",
        params: { unit: cuteAnimal },
      });

      commands.push({
        type: "effect",
        params: {
          type: "gentle-spawn",
          x: spawnPos.x,
          y: spawnPos.y,
          color: "#90EE90",
        },
      });
    } catch (e) {}
  }

  private getEdgeSpawnPosition(context: TickContext): { x: number; y: number } {
    const edge = Math.floor(context.getRandom() * 4);
    const margin = 2;

    switch (edge) {
      case 0:
        return { x: context.getRandom() * context.getFieldWidth(), y: margin };
      case 1:
        return {
          x: context.getFieldWidth() - margin,
          y: context.getRandom() * context.getFieldHeight(),
        };
      case 2:
        return {
          x: context.getRandom() * context.getFieldWidth(),
          y: context.getFieldHeight() - margin,
        };
      case 3:
        return { x: margin, y: context.getRandom() * context.getFieldHeight() };
      default:
        return { x: margin, y: margin };
    }
  }

  private getRandomWanderTarget(context: TickContext): {
    x: number;
    y: number;
  } {
    return {
      x: context.getRandom() * context.getFieldWidth(),
      y: context.getRandom() * context.getFieldHeight(),
    };
  }
}
