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
    const context = this.sim.getTickContext();

    const capacity = arrays.capacity;
    const fieldWidth = context.getFieldWidth();
    const fieldHeight = context.getFieldHeight();

    const posX = arrays.posX;
    const posY = arrays.posY;
    const moveX = arrays.intendedMoveX;
    const moveY = arrays.intendedMoveY;

    // Apply movement, but skip frozen or stunned units
    for (let i = 0; i < capacity; i++) {
      // Check if unit is frozen or stunned in cold data
      const unitId = arrays.unitIds[i];
      const coldData = this.sim.unitColdData.get(unitId);
      if (coldData?.meta?.frozen || coldData?.meta?.stunned) {
        // Don't apply movement for frozen/stunned units
        continue;
      }
      
      posX[i] += moveX[i];
      posY[i] += moveY[i];
    }

    for (let i = 0; i < capacity; i++) {
      moveX[i] = 0;
      moveY[i] = 0;
    }

    this.resolveCollisionsSoA(arrays);
  }

  private resolveCollisionsSoA(arrays: any): void {
    const grid = new Map<number, number>();
    const context = this.sim.getTickContext();
    const fieldWidth = context.getFieldWidth();

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
          y + 1 < context.getFieldHeight() &&
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

    const fieldHeight = context.getFieldHeight();
    for (let i = 0; i < arrays.capacity; i++) {
      if (arrays.active[i] === 0) continue;
      arrays.posX[i] = Math.max(0, Math.min(fieldWidth - 1, arrays.posX[i]));
      arrays.posY[i] = Math.max(0, Math.min(fieldHeight - 1, arrays.posY[i]));
    }
  }
}
