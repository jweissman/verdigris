import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export default class Particles extends Rule {
  private sim: any; // Keep for direct particle access

  constructor(sim: any) {
    super();
    this.sim = sim;
  }

  execute(context: TickContext): QueuedCommand[] {
    if (!this.sim.particleArrays) return;

    // NOTE: updatePhysics is already called in simulator.updateParticles()

    this.sim.particleArrays.applyGravity(0.1);

    const arrays = this.sim.particleArrays;
    const fieldHeight = context.getFieldHeight() * 8; // Convert to pixel coords
    const fieldWidth = context.getFieldWidth() * 8;

    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;

      const typeId = arrays.type[i];
      if (typeId === 3) {
        // 3 = snow
        if (arrays.posY[i] >= fieldHeight - 1) {
          arrays.landed[i] = 1;
          arrays.posY[i] = fieldHeight - 1;
          arrays.velX[i] = 0;
          arrays.velY[i] = 0;
        }
      }

      const isStormCloud = typeId === 13;
      if (
        arrays.landed[i] === 0 &&
        !isStormCloud &&
        (arrays.posX[i] < -50 ||
          arrays.posX[i] > fieldWidth + 50 ||
          arrays.posY[i] < -50 ||
          arrays.posY[i] > fieldHeight + 50)
      ) {
        // Give generous buffer
        arrays.removeParticle(i);
      }
    }

    return [];
  }
}
