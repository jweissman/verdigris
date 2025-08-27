import { Command, CommandParams } from "../rules/command";

/**
 * Background command - changes the scene/landscape
 * Params:
 *   scene?: string - Scene name (forest, desert, cave, city, etc.)
 *   tileset?: string - Tileset to use
 *   biome?: string - Biome type (affects gameplay rules)
 *   skyColor?: string - Sky/background color
 *   ambientLight?: number - Ambient light level (0-1)
 */
export class BgCommand extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const scene = params.scene as string | undefined;
    const tileset = params.tileset as string | undefined;
    const biome = params.biome as string | undefined;
    const skyColor = params.skyColor as string | undefined;
    const ambientLight = params.ambientLight as number | undefined;
    
    // Build scene metadata update
    const sceneData: any = {};
    
    if (scene) {
      // Preset scenes with appropriate defaults
      switch (scene) {
        case 'forest':
          sceneData.tileset = tileset || 'forest';
          sceneData.biome = biome || 'forest';
          sceneData.skyColor = skyColor || '#87CEEB';
          sceneData.ambientLight = ambientLight ?? 0.8;
          sceneData.fogColor = '#E6F3E6';
          sceneData.fogDensity = 0.2;
          break;
          
        case 'desert':
          sceneData.tileset = tileset || 'desert';
          sceneData.biome = biome || 'desert';
          sceneData.skyColor = skyColor || '#FFE4B5';
          sceneData.ambientLight = ambientLight ?? 1.0;
          sceneData.fogColor = '#FFF8DC';
          sceneData.fogDensity = 0.1;
          break;
          
        case 'cave':
          sceneData.tileset = tileset || 'cave';
          sceneData.biome = biome || 'cave';
          sceneData.skyColor = skyColor || '#2F4F4F';
          sceneData.ambientLight = ambientLight ?? 0.3;
          sceneData.fogColor = '#1C1C1C';
          sceneData.fogDensity = 0.4;
          break;
          
        case 'city':
          sceneData.tileset = tileset || 'city';
          sceneData.biome = biome || 'urban';
          sceneData.skyColor = skyColor || '#B0C4DE';
          sceneData.ambientLight = ambientLight ?? 0.9;
          sceneData.fogColor = '#D3D3D3';
          sceneData.fogDensity = 0.15;
          break;
          
        case 'underwater':
          sceneData.tileset = tileset || 'underwater';
          sceneData.biome = biome || 'aquatic';
          sceneData.skyColor = skyColor || '#006994';
          sceneData.ambientLight = ambientLight ?? 0.5;
          sceneData.fogColor = '#00CED1';
          sceneData.fogDensity = 0.6;
          break;
          
        case 'space':
          sceneData.tileset = tileset || 'space';
          sceneData.biome = biome || 'void';
          sceneData.skyColor = skyColor || '#000033';
          sceneData.ambientLight = ambientLight ?? 0.2;
          sceneData.fogColor = '#000066';
          sceneData.fogDensity = 0.05;
          break;
          
        default:
          sceneData.scene = scene;
      }
      
      sceneData.scene = scene;
    }
    
    // Apply individual overrides
    if (tileset && !scene) sceneData.tileset = tileset;
    if (biome && !scene) sceneData.biome = biome;
    if (skyColor && !scene) sceneData.skyColor = skyColor;
    if (ambientLight !== undefined && !scene) sceneData.ambientLight = ambientLight;
    
    // Update scene metadata
    if (!this.sim.sceneMetadata) {
      this.sim.sceneMetadata = {};
    }
    
    Object.assign(this.sim.sceneMetadata, sceneData);
    
    // Trigger biome change if specified
    if (sceneData.biome) {
      this.sim.currentBiome = sceneData.biome;
    }
    
    // Add some ambient particles for atmosphere
    if (scene === 'forest') {
      // Add falling leaves
      this.sim.queuedCommands.push({
        type: 'weather',
        params: { weatherType: 'leaves', duration: 100 }
      });
    } else if (scene === 'desert') {
      // Add sandstorm effect
      this.sim.queuedCommands.push({
        type: 'weather',
        params: { weatherType: 'sandstorm', duration: 60, intensity: 0.3 }
      });
    } else if (scene === 'underwater') {
      // Add bubbles
      for (let i = 0; i < 20; i++) {
        this.sim.particleArrays.addParticle({
          id: `bubble_${this.sim.ticks}_${i}`,
          type: 'bubble',
          pos: {
            x: Math.random() * this.sim.fieldWidth * 8,
            y: this.sim.fieldHeight * 8 - Math.random() * 20,
          },
          vel: { x: (Math.random() - 0.5) * 0.2, y: -0.5 - Math.random() * 0.5 },
          radius: 0.3 + Math.random() * 0.3,
          color: '#FFFFFF',
          lifetime: 100 + Math.random() * 100,
        });
      }
    }
  }
}