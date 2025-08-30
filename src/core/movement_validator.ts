import { Unit } from "../types/Unit";

/**
 * Validates unit movement and handles position checks
 * Extracted from Simulator to reduce complexity
 */
export class MovementValidator {
  private positionMap: Map<string, Set<Unit>> = new Map();

  constructor(
    private fieldWidth: number,
    private fieldHeight: number
  ) {}

  validMove(unit: any, dx: number, dy: number, units?: readonly Unit[]): boolean {
    if (!unit) return false;

    if (unit.meta?.huge) {
      const bodyPositions = this.getHugeUnitBodyPositions(unit);

      for (const pos of bodyPositions) {
        const newX = pos.x + dx;
        const newY = pos.y + dy;

        if (
          newX < 0 ||
          newX >= this.fieldWidth ||
          newY < 0 ||
          newY >= this.fieldHeight
        ) {
          return false;
        }

        if (this.isApparentlyOccupied(newX, newY, unit, units)) {
          return false;
        }
      }

      return true;
    }

    const newX = unit.pos.x + dx;
    const newY = unit.pos.y + dy;

    if (
      newX < 0 ||
      newX >= this.fieldWidth ||
      newY < 0 ||
      newY >= this.fieldHeight
    )
      return false;

    return !this.isApparentlyOccupied(newX, newY, unit, units);
  }

  getHugeUnitBodyPositions(unit: any) {
    if (!unit.meta?.huge) return [unit.pos];

    return [
      unit.pos, // Head
      { x: unit.pos.x, y: unit.pos.y + 1 }, // Body segment 1
      { x: unit.pos.x, y: unit.pos.y + 2 }, // Body segment 2
      { x: unit.pos.x, y: unit.pos.y + 3 }, // Body segment 3
    ];
  }

  isApparentlyOccupied(
    x: number,
    y: number,
    excludeUnit: Unit | null = null,
    units?: readonly Unit[]
  ): boolean {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    if (this.positionMap.size > 0) {
      const key = `${roundedX},${roundedY}`;
      const unitsAtPosition = this.positionMap.get(key);
      if (unitsAtPosition) {
        for (const unit of unitsAtPosition) {
          if (unit === excludeUnit) continue;
          if (this.isOwnPhantom(unit, excludeUnit)) continue;
          return true;
        }
      }
      return false;
    }

    // Fallback to linear search if position map is not available
    if (units) {
      for (const unit of units) {
        if (unit === excludeUnit) continue;
        if (unit.state === "dead") continue;

        if (unit.meta?.huge) {
          const bodyPositions = this.getHugeUnitBodyPositions(unit);
          for (const pos of bodyPositions) {
            if (Math.round(pos.x) === roundedX && Math.round(pos.y) === roundedY) {
              if (!this.isOwnPhantom(unit, excludeUnit)) {
                return true;
              }
            }
          }
        } else {
          if (
            Math.round(unit.pos.x) === roundedX &&
            Math.round(unit.pos.y) === roundedY
          ) {
            if (!this.isOwnPhantom(unit, excludeUnit)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private isOwnPhantom(unit: Unit | null, owner: Unit | null): boolean {
    if (!unit) return false;
    
    return (
      (unit.meta && unit.meta.phantom && unit.meta.parentId === owner?.id) ||
      unit === owner
    );
  }

  updatePositionMap(units: readonly Unit[]): void {
    this.positionMap.clear();
    for (const unit of units) {
      if (unit.state === "dead") continue;

      if (unit.meta?.huge) {
        const bodyPositions = this.getHugeUnitBodyPositions(unit);
        for (const pos of bodyPositions) {
          const key = `${Math.round(pos.x)},${Math.round(pos.y)}`;
          if (!this.positionMap.has(key)) {
            this.positionMap.set(key, new Set());
          }
          this.positionMap.get(key)!.add(unit);
        }
      } else {
        const key = `${Math.round(unit.pos.x)},${Math.round(unit.pos.y)}`;
        if (!this.positionMap.has(key)) {
          this.positionMap.set(key, new Set());
        }
        this.positionMap.get(key)!.add(unit);
      }
    }
  }

  getPositionMap(): Map<string, Set<Unit>> {
    return this.positionMap;
  }
}