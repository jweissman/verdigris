import { Rule } from "./rule";

export default class Particles extends Rule {
  apply = () => {
    for (const particle of this.sim.particles) {
      if (particle.state === 'dead') continue;

      // Update particle position based on velocity
      particle.pos.x += particle.vel.x;
      particle.pos.y += particle.vel.y;

      // Check for boundary collisions
      if (particle.pos.x < 0 || particle.pos.x > this.sim.width ||
          particle.pos.y < 0 || particle.pos.y > this.sim.height) {
        particle.state = 'dead'; // Mark as dead if out of bounds
      }
    }
  }
}