import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { QueuedCommand } from "../core/command_handler";

/**
 * Physics rule - handles projectile movement
 * This runs during the rule phase to update projectile positions
 */
export class Physics extends Rule {
  private sim: any;

  constructor(sim: any) {
    super();
    this.sim = sim;
  }

  execute(_context: TickContext): QueuedCommand[] {
    this.updateProjectiles();
    return [];
  }

  private updateProjectiles(): void {
    if (!this.sim.projectiles) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.sim.projectiles.length; i++) {
      const p = this.sim.projectiles[i];

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      if (p.type === "bomb") {
        // Old gravity system for bombs without targets
        if (!p.target) {
          p.vel.y += 0.2;
        }
        p.lifetime = (p.lifetime || 0) + 1;
        
        // New progress system for targeted bombs
        if (p.duration !== undefined) {
          p.progress = (p.progress || 0) + 1;
        }
      }

      if (
        p.pos.x < 0 ||
        p.pos.x >= this.sim.fieldWidth ||
        p.pos.y < 0 ||
        p.pos.y >= this.sim.fieldHeight
      ) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.sim.projectiles.splice(toRemove[i], 1);
    }
  }
}
