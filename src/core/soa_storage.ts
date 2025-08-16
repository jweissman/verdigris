/**
 * Structure of Arrays (SoA) storage for high-performance simulation
 * Instead of Array of Structures (units[]), we use Structure of Arrays
 * This enables vectorized operations and better cache locality
 */
export class SoAStorage {
  posX: Float32Array;
  posY: Float32Array;

  velX: Float32Array;
  velY: Float32Array;
  intendedMoveX: Float32Array;
  intendedMoveY: Float32Array;

  hp: Float32Array;
  maxHp: Float32Array;
  mass: Float32Array;
  dmg: Float32Array;

  state: Uint8Array; // 0=idle, 1=walk, 2=attack, 3=dead
  team: Uint8Array; // 0=friendly, 1=hostile, 2=neutral

  active: Uint8Array;

  metaIndex: Uint32Array;

  ids: string[];
  sprites: string[];

  capacity: number;
  activeCount: number;

  idToIndex: Map<string, number>;

  constructor(initialCapacity: number = 1000) {
    this.capacity = initialCapacity;
    this.activeCount = 0;

    this.posX = new Float32Array(initialCapacity);
    this.posY = new Float32Array(initialCapacity);
    this.velX = new Float32Array(initialCapacity);
    this.velY = new Float32Array(initialCapacity);
    this.intendedMoveX = new Float32Array(initialCapacity);
    this.intendedMoveY = new Float32Array(initialCapacity);

    this.hp = new Float32Array(initialCapacity);
    this.maxHp = new Float32Array(initialCapacity);
    this.mass = new Float32Array(initialCapacity);
    this.dmg = new Float32Array(initialCapacity);

    this.state = new Uint8Array(initialCapacity);
    this.team = new Uint8Array(initialCapacity);
    this.active = new Uint8Array(initialCapacity);
    this.metaIndex = new Uint32Array(initialCapacity);

    this.ids = new Array(initialCapacity);
    this.sprites = new Array(initialCapacity);

    this.idToIndex = new Map();
  }

  /**
   * Add a unit to the SoA storage
   * Returns the index where it was stored
   */
  addUnit(unit: any): number {
    let index = this.findFreeSlot();
    if (index === -1) {
      this.grow();
      index = this.activeCount;
    }

    this.posX[index] = unit.pos.x;
    this.posY[index] = unit.pos.y;
    this.velX[index] = unit.vel?.x || 0;
    this.velY[index] = unit.vel?.y || 0;
    this.intendedMoveX[index] = unit.intendedMove?.x || 0;
    this.intendedMoveY[index] = unit.intendedMove?.y || 0;

    this.hp[index] = unit.hp;
    this.maxHp[index] = unit.maxHp || unit.hp;
    this.mass[index] = unit.mass || 1;
    this.dmg[index] = unit.dmg || 1;

    this.state[index] = this.encodeState(unit.state);
    this.team[index] = this.encodeTeam(unit.team);
    this.active[index] = 1;

    this.ids[index] = unit.id;
    this.sprites[index] = unit.sprite;

    this.idToIndex.set(unit.id, index);
    this.activeCount++;

    return index;
  }

  /**
   * Remove a unit by marking it inactive
   */
  removeUnit(id: string): void {
    const index = this.idToIndex.get(id);
    if (index !== undefined) {
      this.active[index] = 0;
      this.idToIndex.delete(id);
      this.activeCount--;
    }
  }

  /**
   * Get unit index by ID
   */
  getIndex(id: string): number | undefined {
    return this.idToIndex.get(id);
  }

  /**
   * Vectorized movement - apply all intended moves at once
   */
  applyMovement(fieldWidth: number, fieldHeight: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;
      if (this.state[i] === 3) continue; // Skip dead

      this.posX[i] += this.intendedMoveX[i];
      this.posY[i] += this.intendedMoveY[i];

      this.posX[i] = Math.max(0, Math.min(fieldWidth - 1, this.posX[i]));
      this.posY[i] = Math.max(0, Math.min(fieldHeight - 1, this.posY[i]));
    }
  }

  /**
   * Vectorized collision detection
   * Returns pairs of colliding indices
   */
  detectCollisions(radius: number = 1): Array<[number, number]> {
    const collisions: Array<[number, number]> = [];
    const radiusSq = radius * radius;

    const grid = new Map<string, number[]>();

    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) continue;

      const gridX = Math.floor(this.posX[i]);
      const gridY = Math.floor(this.posY[i]);
      const key = `${gridX},${gridY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(i);
    }

    for (const indices of grid.values()) {
      if (indices.length < 2) continue;

      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const idx1 = indices[i];
          const idx2 = indices[j];

          const dx = this.posX[idx1] - this.posX[idx2];
          const dy = this.posY[idx1] - this.posY[idx2];
          const distSq = dx * dx + dy * dy;

          if (distSq <= radiusSq) {
            collisions.push([idx1, idx2]);
          }
        }
      }
    }

    return collisions;
  }

  private findFreeSlot(): number {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 0) {
        return i;
      }
    }
    return -1;
  }

  private grow(): void {
    const newCapacity = this.capacity * 2;

    this.posX = this.growArray(this.posX, newCapacity, Float32Array);
    this.posY = this.growArray(this.posY, newCapacity, Float32Array);
    this.velX = this.growArray(this.velX, newCapacity, Float32Array);
    this.velY = this.growArray(this.velY, newCapacity, Float32Array);
    this.intendedMoveX = this.growArray(
      this.intendedMoveX,
      newCapacity,
      Float32Array,
    );
    this.intendedMoveY = this.growArray(
      this.intendedMoveY,
      newCapacity,
      Float32Array,
    );

    this.hp = this.growArray(this.hp, newCapacity, Float32Array);
    this.maxHp = this.growArray(this.maxHp, newCapacity, Float32Array);
    this.mass = this.growArray(this.mass, newCapacity, Float32Array);
    this.dmg = this.growArray(this.dmg, newCapacity, Float32Array);

    this.state = this.growArray(this.state, newCapacity, Uint8Array);
    this.team = this.growArray(this.team, newCapacity, Uint8Array);
    this.active = this.growArray(this.active, newCapacity, Uint8Array);
    this.metaIndex = this.growArray(this.metaIndex, newCapacity, Uint32Array);

    const newIds = new Array(newCapacity);
    const newSprites = new Array(newCapacity);
    for (let i = 0; i < this.capacity; i++) {
      newIds[i] = this.ids[i];
      newSprites[i] = this.sprites[i];
    }
    this.ids = newIds;
    this.sprites = newSprites;

    this.capacity = newCapacity;
  }

  private growArray<T extends Float32Array | Uint8Array | Uint32Array>(
    oldArray: T,
    newSize: number,
    ArrayConstructor: new (size: number) => T,
  ): T {
    const newArray = new ArrayConstructor(newSize);
    newArray.set(oldArray);
    return newArray;
  }

  private encodeState(state: string): number {
    switch (state) {
      case "idle":
        return 0;
      case "walk":
        return 1;
      case "attack":
        return 2;
      case "dead":
        return 3;
      default:
        return 0;
    }
  }

  private encodeTeam(team: string): number {
    switch (team) {
      case "friendly":
        return 0;
      case "hostile":
        return 1;
      case "neutral":
        return 2;
      default:
        return 0;
    }
  }
}
