import { Rule } from './rule';
import Encyclopaedia from '../dmg/encyclopaedia';
import type { TickContext } from "../core/tick_context";

export class AmbientSpawning extends Rule {
  private lastSpawnTick = 0;
  private spawnInterval = 100; // spawn every 100 ticks
  
  execute(context: TickContext): void {
    if (context.getCurrentTick() - this.lastSpawnTick < this.spawnInterval) return;
    
    // Don't spawn if there's active combat (units from different teams)
    const allUnits = context.getAllUnits();
    const teams = new Set(allUnits.filter(u => u.hp > 0).map(u => u.team));
    if (teams.has('friendly') && teams.has('hostile')) {
      return; // Active combat, don't spawn ambient creatures
    }
    
    // Also don't spawn if we already have many units (likely a test scenario)
    if (allUnits.length > 20) {
      return; // Too many units, probably a test
    }
    
    const biome = this.detectBiome(context);
    const cuteAnimals = this.getCuteAnimalsForBiome(biome);
    
    // Don't spawn if no animals for this biome
    if (cuteAnimals.length === 0) {
      return;
    }
    
    // Only spawn if we don't have too many cute animals already
    const currentCuteCount = context.getAllUnits().filter(u => 
      cuteAnimals.includes(u.type) && u.hp > 0
    ).length;
    
    if (currentCuteCount < 10) { // max 10 cute animals
      this.spawnCuteAnimal(context, cuteAnimals, biome);
    }
    
    this.lastSpawnTick = context.getCurrentTick();
  }
  
  private detectBiome(context: TickContext): string {
    const background = context.getSceneBackground();
    
    // Map scene backgrounds to biomes
    if (background.includes('desert') || background.includes('sand')) {
      return 'desert';
    } else if (background.includes('snow') || background.includes('arctic') || background.includes('winter')) {
      return 'arctic';
    } else if (background.includes('forest') || background.includes('tree')) {
      return 'forest';
    } else if (background.includes('arena') || background.includes('test') || background.includes('battle')) {
      return 'none'; // No ambient spawning for test/battle scenes
    }
    
    return 'forest'; // default to forest
  }
  
  private getCuteAnimalsForBiome(biome: string): string[] {
    switch (biome) {
      case 'forest':
        return ['squirrel', 'forest-squirrel', 'bird'];
      case 'desert':
        return ['sand-ant']; // cute little desert creatures
      case 'arctic':
        return ['penguin']; // if we had penguins
      case 'none':
        return []; // No spawning for test/battle scenes
      default:
        return ['squirrel', 'bird'];
    }
  }
  
  private spawnCuteAnimal(context: TickContext, animalTypes: string[], biome: string): void {
    const animalType = animalTypes[Math.floor(context.getRandom() * animalTypes.length)];
    
    try {
      const animalData = Encyclopaedia.unit(animalType);
      if (!animalData) return;
      
      // Spawn at edge of screen for natural entry
      const spawnPos = this.getEdgeSpawnPosition(context);
      
      const cuteAnimal = {
        ...animalData,
        id: `${animalType}_${context.getCurrentTick()}_${Math.floor(context.getRandom() * 1000)}`,
        pos: spawnPos,
        team: 'neutral', // cute animals are neutral
        meta: {
          ...animalData.meta,
          isAmbient: true,
          spawnTick: context.getCurrentTick(),
          wanderTarget: this.getRandomWanderTarget(context)
        }
      };
      
      // Queue spawn command
      context.queueCommand({
        type: 'spawn',
        params: { unit: cuteAnimal }
      });
      
      // Add gentle spawn effect
      context.queueCommand({
        type: 'effect',
        params: {
          type: 'gentle-spawn',
          x: spawnPos.x,
          y: spawnPos.y,
          color: '#90EE90' // light green
        }
      });
      
    } catch (e) {
      // Silently fail - not critical
    }
  }
  
  private getEdgeSpawnPosition(context: TickContext): { x: number; y: number } {
    const edge = Math.floor(context.getRandom() * 4);
    const margin = 2;
    
    switch (edge) {
      case 0: // top
        return { x: context.getRandom() * context.getFieldWidth(), y: margin };
      case 1: // right  
        return { x: context.getFieldWidth() - margin, y: context.getRandom() * context.getFieldHeight() };
      case 2: // bottom
        return { x: context.getRandom() * context.getFieldWidth(), y: context.getFieldHeight() - margin };
      case 3: // left
        return { x: margin, y: context.getRandom() * context.getFieldHeight() };
      default:
        return { x: margin, y: margin };
    }
  }
  
  private getRandomWanderTarget(context: TickContext): { x: number; y: number } {
    return {
      x: context.getRandom() * context.getFieldWidth(),
      y: context.getRandom() * context.getFieldHeight()
    };
  }
}