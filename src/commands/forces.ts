import { Command } from "../rules/command";

/**
 * Higher-order 'forces' command - bulk kinematics and physics processing
 * Replaces individual move commands with vectorized physics updates
 */
export class ForcesCommand extends Command {
  private transform: any;

  constructor(sim: any, transform: any) {
    super(sim);
    this.transform = transform;
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    this.applyAllForces();
  }

  private applyAllForces(): void {
    const arrays = this.sim.proxyManager.arrays;

    const capacity = arrays.capacity;
    const fieldWidth = this.sim.fieldWidth;
    const fieldHeight = this.sim.fieldHeight;

    const posX = arrays.posX;
    const posY = arrays.posY;
    const moveX = arrays.intendedMoveX;
    const moveY = arrays.intendedMoveY;

    for (let i = 0; i < capacity; i++) {
      posX[i] += moveX[i];
      posY[i] += moveY[i];
    }

    for (let i = 0; i < capacity; i++) {
      moveX[i] = 0;
      moveY[i] = 0;
    }

    // Apply collision resolution for overlapping units
    this.resolveCollisionsSoA(arrays);
  }

  private updateProjectiles(): void {
    if (!this.sim.projectiles) return;

    const toRemove: number[] = [];

    for (let i = 0; i < this.sim.projectiles.length; i++) {
      const p = this.sim.projectiles[i];

      p.pos.x += p.vel.x;
      p.pos.y += p.vel.y;

      if (p.type === "bomb") {
        p.vel.y += 0.2;
        p.lifetime = (p.lifetime || 0) + 1;
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



  private resolveCollisionsSoA(arrays: any): void {
    const grid = new Map<number, number>();
    const fieldWidth = this.sim.fieldWidth;

    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0 || arrays.state[i] === 3) continue;

      const packedPos =
        Math.floor(arrays.posY[i]) * fieldWidth + Math.floor(arrays.posX[i]);

      const existing = grid.get(packedPos);
      if (existing !== undefined) {
        const priorityI = arrays.mass[i] * 10 + arrays.hp[i];
        const priorityExisting =
          arrays.mass[existing] * 10 + arrays.hp[existing];

        const toDisplace = priorityI > priorityExisting ? existing : i;

        const x = Math.floor(arrays.posX[toDisplace]);
        const y = Math.floor(arrays.posY[toDisplace]);

        let displaced = false;
        let newPackedPos = packedPos;

        if (x + 1 < fieldWidth && !grid.has(packedPos + 1)) {
          arrays.posX[toDisplace] = x + 1;
          newPackedPos = packedPos + 1;
          displaced = true;
        } else if (x - 1 >= 0 && !grid.has(packedPos - 1)) {
          arrays.posX[toDisplace] = x - 1;
          newPackedPos = packedPos - 1;
          displaced = true;
        } else if (
          y + 1 < this.sim.fieldHeight &&
          !grid.has(packedPos + fieldWidth)
        ) {
          arrays.posY[toDisplace] = y + 1;
          newPackedPos = packedPos + fieldWidth;
          displaced = true;
        } else if (y - 1 >= 0 && !grid.has(packedPos - fieldWidth)) {
          arrays.posY[toDisplace] = y - 1;
          newPackedPos = packedPos - fieldWidth;
          displaced = true;
        }

        if (toDisplace === existing) {
          grid.set(packedPos, i); // Winner takes original position
          if (displaced) {
            grid.set(newPackedPos, existing); // Displaced unit at new position
          }
        } else {
          if (displaced) {
            grid.set(newPackedPos, i); // Displaced unit at new position
          }
        }
      } else {
        grid.set(packedPos, i);
      }
    }

    const fieldHeight = this.sim.fieldHeight;
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      arrays.posX[i] = Math.max(0, Math.min(fieldWidth - 1, arrays.posX[i]));
      arrays.posY[i] = Math.max(0, Math.min(fieldHeight - 1, arrays.posY[i]));
    }
  }
}
