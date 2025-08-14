import { Rule } from './rule';
import Encyclopaedia from '../dmg/encyclopaedia';

export class AmbientSpawning extends Rule {
  private lastSpawnTick = 0;
  private spawnInterval = 100; // spawn every 100 ticks
  
  apply(): void {
    if (this.sim.ticks - this.lastSpawnTick < this.spawnInterval) return;
    
    const biome = this.detectBiome();
    const cuteAnimals = this.getCuteAnimalsForBiome(biome);
    
    // Only spawn if we don't have too many cute animals already
    const currentCuteCount = this.sim.units.filter(u => 
      cuteAnimals.includes(u.type) && u.hp > 0
    ).length;
    
    if (currentCuteCount < 10) { // max 10 cute animals
      this.spawnCuteAnimal(cuteAnimals, biome);
    }
    
    this.lastSpawnTick = this.sim.ticks;
  }
  
  private detectBiome(): string {
    const bg = (this.sim as any).sceneBackground || '';
    if (bg.includes('forest') || bg.includes('title')) return 'forest';
    if (bg.includes('desert')) return 'desert';
    if (bg.includes('arctic') || bg.includes('ice')) return 'arctic';
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
  
  private spawnCuteAnimal(animalTypes: string[], biome: string): void {
    const animalType = animalTypes[Math.floor(Math.random() * animalTypes.length)];
    
    try {
      const animalData = Encyclopaedia.unit(animalType);
      if (!animalData) return;
      
      // Spawn at edge of screen for natural entry
      const spawnPos = this.getEdgeSpawnPosition();
      
      const cuteAnimal = {
        ...animalData,
        id: `${animalType}_${this.sim.ticks}_${Math.floor(Math.random() * 1000)}`,
        pos: spawnPos,
        team: 'neutral', // cute animals are neutral
        meta: {
          ...animalData.meta,
          isAmbient: true,
          spawnTick: this.sim.ticks,
          wanderTarget: this.getRandomWanderTarget()
        }
      };
      
      this.sim.addUnit(cuteAnimal);
      
      // Add gentle spawn effect
      this.sim.queuedCommands.push({
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
  
  private getEdgeSpawnPosition(): { x: number; y: number } {
    const edge = Math.floor(Math.random() * 4);
    const margin = 2;
    
    switch (edge) {
      case 0: // top
        return { x: Math.random() * this.sim.width, y: margin };
      case 1: // right  
        return { x: this.sim.width - margin, y: Math.random() * this.sim.height };
      case 2: // bottom
        return { x: Math.random() * this.sim.width, y: this.sim.height - margin };
      case 3: // left
        return { x: margin, y: Math.random() * this.sim.height };
      default:
        return { x: margin, y: margin };
    }
  }
  
  private getRandomWanderTarget(): { x: number; y: number } {
    return {
      x: Math.random() * this.sim.width,
      y: Math.random() * this.sim.height
    };
  }
}