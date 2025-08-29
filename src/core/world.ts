/**
 * World entity holds scene-level properties that can be accessed by scripts
 * Separates visual/scene metadata from core simulation
 */
export class World {
  public sceneBackground: string = "winter";
  public sceneMetadata: Record<string, any> = {};
  public currentBiome?: string;
  public enableEnvironmentalEffects: boolean = false;
  
  constructor() {
    this.sceneMetadata = {};
  }
  
  setBackground(value: string): void {
    this.sceneBackground = value;
  }
  
  getSceneBackground(): string {
    return this.sceneBackground;
  }
  
  setSceneMetadata(key: string, value: any): void {
    this.sceneMetadata[key] = value;
  }
  
  setStripWidth(value: number): void {
    this.sceneMetadata.stripWidth = value;
  }
  
  setBattleHeight(value: number): void {
    this.sceneMetadata.battleHeight = value;
  }
  
  setBiome(biome: string): void {
    this.currentBiome = biome;
  }
  
  setEnvironmentalEffects(enabled: boolean): void {
    this.enableEnvironmentalEffects = enabled;
  }
}