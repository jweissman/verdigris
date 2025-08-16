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
    const arrays = this.sim.getUnitArrays();
    if (!arrays) {
      this.applyAllForcesLegacy();
      return;
    }

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

  private applyAllForcesLegacy(): void {
    const moveUpdates = new Map<string, { pos: { x: number; y: number } }>();
    const units = this.sim.units;

    for (const unit of units) {
      if (unit.state === "dead" || unit.hp <= 0) continue;
      if (unit.meta.jumping) continue; // Skip jumping units
      if (unit.meta.phantom) continue; // Skip phantom units - they follow parent

      const intendedMove = unit.intendedMove;
      if (!intendedMove || (intendedMove.x === 0 && intendedMove.y === 0))
        continue;

      const newX = unit.pos.x + intendedMove.x;
      const newY = unit.pos.y + intendedMove.y;

      const clampedX = Math.max(0, Math.min(this.sim.fieldWidth - 1, newX));
      const clampedY = Math.max(0, Math.min(this.sim.fieldHeight - 1, newY));

      moveUpdates.set(unit.id, { pos: { x: clampedX, y: clampedY } });
    }

    const occupancy = new Map<string, string>();

    for (const unit of units) {
      if (!moveUpdates.has(unit.id) && unit.state !== "dead") {
        const key = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
        occupancy.set(key, unit.id);
      }
    }

    for (const [unitId, update] of moveUpdates) {
      const key = `${Math.round(update.pos.x)},${Math.round(update.pos.y)}`;
      const unit = units.find((u) => u.id === unitId);

      if (!occupancy.has(key)) {
        occupancy.set(key, unitId);
      } else {
        const occupyingId = occupancy.get(key);
        const occupyingUnit = units.find((u) => u.id === occupyingId);

        if (unit && occupyingUnit) {
          const myPriority = (unit.mass || 1) * 10 + (unit.hp || 0);
          const theirPriority =
            (occupyingUnit.mass || 1) * 10 + (occupyingUnit.hp || 0);

          if (myPriority > theirPriority) {
            occupancy.set(key, unitId);

            moveUpdates.set(occupyingId, {
              pos: { x: occupyingUnit.pos.x, y: occupyingUnit.pos.y },
            });
          } else {
            const currentKey = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
            occupancy.set(currentKey, unitId);
            moveUpdates.set(unitId, { pos: { x: unit.pos.x, y: unit.pos.y } });
          }
        }
      }
    }

    for (const [unitId, update] of moveUpdates) {
      this.transform.updateUnit(unitId, update);
    }

    this.resolveOverlaps();
  }

  private resolveOverlaps(): void {
    const positionMap = new Map<string, string[]>();

    for (const unit of this.sim.units) {
      if (unit.state === "dead") continue;
      const key = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;

      if (!positionMap.has(key)) {
        positionMap.set(key, []);
      }
      positionMap.get(key)!.push(unit.id);
    }

    const occupiedPositions = new Set<string>();
    for (const [pos, unitIds] of positionMap) {
      if (unitIds.length > 0) {
        occupiedPositions.add(pos);
      }
    }

    this.separateOverlapping(positionMap, occupiedPositions);
  }

  separateOverlapping(
    positionMap: Map<string, string[]>,
    occupiedPositions: Set<string>,
  ): boolean {
    for (const [_pos, unitIds] of positionMap) {
      if (unitIds.length <= 1) continue; // No collision

      const unitsWithPriority = unitIds
        .map((id) => {
          const unit = this.sim.units.find((u) => u.id === id);
          if (!unit) return null;
          return { id, priority: (unit.mass || 1) * 10 + (unit.hp || 0), unit };
        })
        .filter((x) => x !== null) as any[];

      unitsWithPriority.sort((a, b) => b.priority - a.priority);

      for (let i = 1; i < unitsWithPriority.length; i++) {
        const unit = unitsWithPriority[i].unit;
        if (!unit) continue;

        const displacements = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ];
        let displaced = false;

        for (const [dx, dy] of displacements) {
          const newX = Math.round(unit.pos.x + dx);
          const newY = Math.round(unit.pos.y + dy);

          if (
            newX < 0 ||
            newX >= this.sim.fieldWidth ||
            newY < 0 ||
            newY >= this.sim.fieldHeight
          ) {
            continue;
          }

          const newKey = `${newX},${newY}`;
          if (!occupiedPositions.has(newKey)) {
            this.transform.updateUnit(unit.id, { pos: { x: newX, y: newY } });
            occupiedPositions.add(newKey); // Mark new position as occupied
            displaced = true;
            break;
          }
        }

        if (!displaced) {
          return false;
        }
      }
    }
    return true;
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
