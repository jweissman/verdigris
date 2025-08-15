import { Rule } from './rule';
import Encyclopaedia from '../dmg/encyclopaedia';
import type { TickContext } from "../core/tick_context";

export class AmbientSpawning extends Rule {
  private lastSpawnTick = 0;
  private spawnInterval = 100; // spawn every 100 ticks
  
  execute(context: TickContext): void {
    if (context.getCurrentTick() - this.lastSpawnTick < this.spawnInterval) return;
    
    const biome = this.detectBiome(context);
    const cuteAnimals = this.getCuteAnimalsForBiome(biome);
    
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
    // TODO: Need scene background access through context
    // For now, default to forest
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