export class UnitArrays {
  posX: Float32Array;
  posY: Float32Array;
  intendedMoveX: Float32Array;
  intendedMoveY: Float32Array;

  hp: Int16Array;
  maxHp: Int16Array;
  dmg: Int16Array;

  mass: Float32Array;

  team: Int8Array; // 0=neutral, 1=friendly, 2=hostile
  state: Int8Array; // 0=idle, 1=moving, 2=attacking, 3=dead

  active: Uint8Array; // 0=inactive, 1=active
  activeCount: number = 0;
  activeIndices: number[] = []; // Track which indices are active for fast iteration

  unitIds: string[];

  capacity: number;

  constructor(capacity: number = 1000) {
    this.capacity = capacity;

    this.posX = new Float32Array(capacity);
    this.posY = new Float32Array(capacity);
    this.intendedMoveX = new Float32Array(capacity);
    this.intendedMoveY = new Float32Array(capacity);

    this.hp = new Int16Array(capacity);
    this.maxHp = new Int16Array(capacity);
    this.dmg = new Int16Array(capacity);

    this.mass = new Float32Array(capacity);

    this.team = new Int8Array(capacity);
    this.state = new Int8Array(capacity);

    this.active = new Uint8Array(capacity);
    this.unitIds = new Array(capacity);
  }

  addUnit(unit: any): number {
    return this.add(unit);
  }

  add(unit: any): number {
    let index = -1;
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      console.warn("UnitArrays: Capacity exceeded");
      return -1;
    }

    this.posX[index] = unit.pos.x;
    this.posY[index] = unit.pos.y;
    this.intendedMoveX[index] = unit.intendedMove?.x || 0;
    this.intendedMoveY[index] = unit.intendedMove?.y || 0;

    this.hp[index] = unit.hp;
    this.maxHp[index] = unit.maxHp;
    this.dmg[index] = unit.dmg || 1;

    this.mass[index] = unit.mass || 1;

    this.team[index] = this.teamToInt(unit.team);
    this.state[index] = this.stateToInt(unit.state);

    this.active[index] = 1;
    this.unitIds[index] = unit.id;
    this.activeCount++;
    this.activeIndices.push(index); // Track active index

    return index;
  }

  remove(index: number): void {
    if (index < 0 || index >= this.capacity) return;

    this.active[index] = 0;
    this.unitIds[index] = "";
    this.activeCount--;

    const idx = this.activeIndices.indexOf(index);
    if (idx !== -1) {
      this.activeIndices.splice(idx, 1);
    }
  }

  teamToInt(team: string): number {
    switch (team) {
      case "neutral":
        return 0;
      case "friendly":
        return 1;
      case "hostile":
        return 2;
      default:
        return 0;
    }
  }

  intToTeam(value: number): string {
    switch (value) {
      case 0:
        return "neutral";
      case 1:
        return "friendly";
      case 2:
        return "hostile";
      default:
        return "neutral";
    }
  }

  stateToInt(state: string): number {
    switch (state) {
      case "idle":
        return 0;
      case "moving":
        return 1;
      case "attacking":
        return 2;
      case "dead":
        return 3;
      default:
        return 0;
    }
  }

  intToState(value: number): string {
    switch (value) {
      case 0:
        return "idle";
      case 1:
        return "moving";
      case 2:
        return "attacking";
      case 3:
        return "dead";
      default:
        return "idle";
    }
  }

  clear(): void {
    this.active.fill(0);
    this.activeCount = 0;
    this.activeIndices = [];
  }

  rebuildActiveIndices(): void {
    this.activeIndices = [];
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i]) {
        this.activeIndices.push(i);
      }
    }
  }

  distanceSquared(i: number, j: number): number {
    const dx = this.posX[i] - this.posX[j];
    const dy = this.posY[i] - this.posY[j];
    return dx * dx + dy * dy;
  }

  findUnitsWithinRadius(
    centerX: number,
    centerY: number,
    radius: number,
  ): number[] {
    const radiusSq = radius * radius;
    const indices: number[] = [];

    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;

      const dx = this.posX[i] - centerX;
      const dy = this.posY[i] - centerY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= radiusSq) {
        indices.push(i);
      }
    }

    return indices;
  }

  detectCollisions(collisionRadius: number = 1): Array<[number, number]> {
    const collisions: Array<[number, number]> = [];
    const radiusSq = collisionRadius * collisionRadius;

    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;

      for (let j = i + 1; j < this.capacity; j++) {
        if (this.active[j] === 0) continue;

        const dx = this.posX[i] - this.posX[j];
        const dy = this.posY[i] - this.posY[j];
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          collisions.push([i, j]);
        }
      }
    }

    return collisions;
  }
}
