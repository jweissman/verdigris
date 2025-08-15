import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";

export default class Particles extends Rule {
  private sim: any; // Keep for direct particle access
  
  constructor(sim: any) {
    super();
    this.sim = sim;
  }
  
  execute(context: TickContext): void {
    // TODO: This should be refactored to use commands for particle updates
    // For now, we need direct access to particles array
    if (!this.sim.particles) return;
    
    for (const particle of this.sim.particles) {
      if (particle.state === 'dead') continue;

      // Handle landed particles - they don't move
      if (particle.landed) continue;

      // Update particle position based on velocity
      particle.pos.x += particle.vel.x;
      particle.pos.y += particle.vel.y;

      // Check for landing (snow particles)
      if (particle.type === 'snow' && particle.pos.y >= context.getFieldHeight() - 1) {
        particle.landed = true;
        particle.pos.y = context.getFieldHeight() - 1;
        particle.vel.x = 0;
        particle.vel.y = 0;
        continue;
      }

      // Check for boundary collisions
      if (particle.pos.x < 0 || particle.pos.x > context.getFieldWidth() ||
          particle.pos.y < 0 || particle.pos.y > context.getFieldHeight()) {
        particle.state = 'dead'; // Mark as dead if out of bounds
      }
    }
  }
}