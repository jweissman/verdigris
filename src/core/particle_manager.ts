import { ParticleArrays } from "../sim/particle_arrays";
import { Particle } from "../types/Particle";

/**
 * Manages particle effects separately from core simulation
 * This is primarily for visual effects that don't affect gameplay
 */
export class ParticleManager {
  public particleArrays: ParticleArrays;
  
  constructor(capacity: number = 5000) {
    this.particleArrays = new ParticleArrays(capacity);
  }
  
  get particles(): Particle[] {
    const result: Particle[] = [];
    const arrays = this.particleArrays;
    
    for (let i = 0; i < arrays.capacity; i++) {
      if (!arrays.active || arrays.active[i] === 0) continue;
      
      const typeId = arrays.type[i];
      result.push({
        id: arrays.particleIds[i] || `particle_${i}`,
        type: this.getParticleTypeName(typeId),
        pos: { x: arrays.posX[i], y: arrays.posY[i] },
        vel: { x: arrays.velX[i], y: arrays.velY[i] },
        radius: arrays.radius[i],
        lifetime: arrays.lifetime[i],
        color: arrays.color[i] || "#ffffff",
        z: arrays.z[i],
        landed: arrays.landed[i] === 1,
      });
    }
    
    return result;
  }
  
  private getParticleTypeName(typeId: number): any {
    const types = [
      "fire",
      "smoke",
      "debris",
      "magic",
      "healing",
      "lightning",
      "explosion",
      "leaf",
      "rain",
      "test_particle",
      "impact",
      "text",
      "lightning_branch",
      "grapple_line",
      "dust",
      "spark",
      "blood",
      "snow",
    ];
    return types[typeId] || "unknown";
  }
  
  addParticle(particle: Partial<Particle>): void {
    // Ensure required fields are provided with defaults
    const fullParticle = {
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      lifetime: 100,
      ...particle
    };
    this.particleArrays.addParticle(fullParticle);
  }
  
  updateParticles(fieldWidth: number, fieldHeight: number): void {
    const arrays = this.particleArrays;
    
    // Apply gravity to particles that need it
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      
      // Only apply gravity to particles we don't manually control
      if (arrays.type[i] !== 7 && arrays.type[i] !== 8) { // Not leaf or rain
        arrays.velY[i] += 0.1;
      }
    }
    
    // Update specific particle types
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      
      const particleType = arrays.type[i];
      
      if (particleType === 1) { // leaf - corrected type ID
        this.updateLeafParticle(i, fieldWidth * 8);
      } else if (particleType === 2) { // rain - corrected type ID
        this.updateRainParticle(i, fieldWidth);
      } else {
        // Standard particle update
        arrays.posX[i] += arrays.velX[i];
        arrays.posY[i] += arrays.velY[i];
        arrays.velX[i] *= 0.95;
        arrays.velY[i] *= 0.95;
      }
      
      // Update lifetime
      arrays.lifetime[i]--;
      if (arrays.lifetime[i] <= 0) {
        arrays.removeParticle(i);
      }
    }
  }
  
  private updateLeafParticle(index: number, fieldWidthPixels: number): void {
    const arrays = this.particleArrays;
    
    if (arrays.landed[index] === 1) {
      arrays.velX[index] = 0;
      arrays.velY[index] = 0;
      arrays.lifetime[index] -= 3; // Fade faster when landed
      return;
    }
    
    arrays.velX[index] = 0;
    arrays.velY[index] = 0.5; // Constant fall speed
    
    const gridX = Math.floor(arrays.posX[index] / 8);
    arrays.posX[index] = gridX * 8 + 4; // Center of grid cell
    arrays.posY[index] += arrays.velY[index];
    
    if (arrays.z[index] !== undefined) {
      arrays.z[index] = Math.max(0, arrays.z[index] - Math.abs(arrays.velY[index]) * 0.5);
    }
    
    // Wrap horizontally
    if (arrays.posX[index] < 0) arrays.posX[index] = fieldWidthPixels + arrays.posX[index];
    if (arrays.posX[index] > fieldWidthPixels) arrays.posX[index] = arrays.posX[index] - fieldWidthPixels;
    
    if (arrays.z[index] !== undefined && arrays.z[index] <= 0) {
      arrays.landed[index] = 1;
      arrays.z[index] = 0;
      
      const gridX = Math.floor(arrays.posX[index] / 8);
      const gridY = Math.floor(arrays.posY[index] / 8);
      arrays.posX[index] = gridX * 8 + 4;
      arrays.posY[index] = gridY * 8 + 4;
      
      arrays.velX[index] = 0;
      arrays.velY[index] = 0;
      arrays.lifetime[index] = Math.min(arrays.lifetime[index], 20);
    }
  }
  
  private updateRainParticle(index: number, fieldWidth: number): void {
    const arrays = this.particleArrays;
    
    if (arrays.landed[index] === 1) {
      arrays.velX[index] = 0;
      arrays.velY[index] = 0;
      return;
    }
    
    arrays.velX[index] = 0;
    arrays.velY[index] = 1.0; // Faster than leaves
    
    const gridX = Math.floor(arrays.posX[index] / 8);
    arrays.posX[index] = gridX * 8 + 4;
    arrays.posY[index] += arrays.velY[index];
    
    if (arrays.z[index] !== undefined) {
      arrays.z[index] = Math.max(0, arrays.z[index] - arrays.velY[index] * 2);
    }
    
    // Wrap horizontally  
    if (arrays.posX[index] < 0) arrays.posX[index] = fieldWidth;
    if (arrays.posX[index] > fieldWidth) arrays.posX[index] = 0;
    
    if (arrays.z[index] !== undefined && arrays.z[index] <= 0) {
      arrays.landed[index] = 1;
      arrays.z[index] = 0;
      
      const gridX = Math.floor(arrays.posX[index] / 8);
      const gridY = Math.floor(arrays.posY[index] / 8);
      arrays.posX[index] = gridX * 8 + 4;
      arrays.posY[index] = gridY * 8 + 4;
      
      arrays.velX[index] = 0;
      arrays.velY[index] = 0;
      arrays.lifetime[index] = Math.min(arrays.lifetime[index], 30);
    }
  }
  
  spawnLeafParticle(fieldWidth: number, fieldHeight: number): void {
    const x = Math.random() * fieldWidth * 8;
    this.particleArrays.addParticle({
      id: `leaf_${Date.now()}`,
      type: "leaf",
      pos: { x, y: -10 },
      vel: { x: 0, y: 0.5 },
      radius: 2,
      lifetime: 500,
      color: "#8b7355",
      z: fieldHeight * 8 + Math.random() * 50,
    });
  }
  
  spawnRainParticle(fieldWidth: number, fieldHeight: number): void {
    this.particleArrays.addParticle({
      id: `rain_${Date.now()}`,
      type: "rain",
      pos: { x: Math.random() * fieldWidth * 8, y: -10 },
      vel: { x: 0, y: 1 },
      radius: 1,
      lifetime: 300,
      color: "#4488ff",
      z: fieldHeight * 8,
    });
  }
  
  spawnFireParticle(x: number, y: number): void {
    this.particleArrays.addParticle({
      id: `fire_${Date.now()}`,
      type: "fire",
      pos: { x, y },
      vel: { x: (Math.random() - 0.5) * 2, y: -Math.random() * 2 },
      radius: 2 + Math.random() * 2,
      lifetime: 20 + Math.random() * 20,
      color: Math.random() > 0.5 ? "#ff4400" : "#ff8800",
    });
  }
  
  clear(): void {
    this.particleArrays = new ParticleArrays(this.particleArrays.capacity);
  }
}