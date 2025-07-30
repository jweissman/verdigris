import { Rule } from "./rule";

export class ProjectileMotion extends Rule {
  apply = () => {
    this.sim.projectiles = this.sim.projectiles.map(proj => ({
      ...proj,
      pos: {
        x: proj.pos.x + proj.vel.x,
        y: proj.pos.y + proj.vel.y
      }
    }));
  }
}
