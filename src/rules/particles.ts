import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";

export default class Particles extends Rule {
  private sim: any; // Keep for direct particle access
  
  constructor(sim: any) {
    super();
    this.sim = sim;
  }
  
  execute(context: TickContext): void {
    // Use the optimized particle physics from ParticleArrays
    if (!this.sim.particleArrays) return;
    
    // NOTE: updatePhysics is already called in simulator.updateParticles()
    // Don't double-call it here!
    
    // Apply gravity to non-landed particles
    this.sim.particleArrays.applyGravity(0.1);
    
    // Handle special particle behaviors that need per-particle logic
    const arrays = this.sim.particleArrays;
    const fieldHeight = context.getFieldHeight() * 8; // Convert to pixel coords
    const fieldWidth = context.getFieldWidth() * 8;
    
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      
      // Check for landing (snow particles)
      const typeId = arrays.type[i];
      if (typeId === 3 && arrays.posY[i] >= fieldHeight - 1) { // 3 = snow
        arrays.landed[i] = 1;
        arrays.posY[i] = fieldHeight - 1;
        arrays.velX[i] = 0;
        arrays.velY[i] = 0;
      }
      
      // Check for boundary collisions - deactivate out of bounds particles
      // Don't remove landed particles or storm clouds (which float around)
      const isStormCloud = typeId === 13; // storm_cloud type
      if (arrays.landed[i] === 0 && !isStormCloud &&
          (arrays.posX[i] < -50 || arrays.posX[i] > fieldWidth + 50 ||
           arrays.posY[i] < -50 || arrays.posY[i] > fieldHeight + 50)) { // Give generous buffer
        arrays.removeParticle(i);
      }
    }
  }
}