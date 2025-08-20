/**
 * PhysicsStore - Component store for unit physics data
 * Part of the SoA (Structure of Arrays) architecture refactoring
 *
 * This store manages physics-related data for all units efficiently,
 * providing fast access and updates without object allocation.
 */
export class PhysicsStore {
  private mass: Float32Array;
  private velocityX: Float32Array;
  private velocityY: Float32Array;
  private accelerationX: Float32Array;
  private accelerationY: Float32Array;
  private friction: Float32Array;
  private bounciness: Float32Array;
  private z: Float32Array; // Height/altitude
  private capacity: number;
  private activeCount: number = 0;
  private freeIndices: number[] = [];
  private unitIdToIndex: Map<string, number> = new Map();

  constructor(capacity: number = 10000) {
    this.capacity = capacity;
    this.mass = new Float32Array(capacity);
    this.velocityX = new Float32Array(capacity);
    this.velocityY = new Float32Array(capacity);
    this.accelerationX = new Float32Array(capacity);
    this.accelerationY = new Float32Array(capacity);
    this.friction = new Float32Array(capacity);
    this.bounciness = new Float32Array(capacity);
    this.z = new Float32Array(capacity);

    for (let i = 0; i < capacity; i++) {
      this.mass[i] = 1.0;
      this.friction[i] = 0.9;
      this.bounciness[i] = 0.5;
    }
  }

  /**
   * Allocate a physics slot for a unit
   */
  allocate(
    unitId: string,
    mass: number = 1.0,
    friction: number = 0.9,
    bounciness: number = 0.5,
  ): number {
    let index: number;

    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else if (this.activeCount < this.capacity) {
      index = this.activeCount++;
    } else {
      throw new Error("PhysicsStore capacity exceeded");
    }

    this.unitIdToIndex.set(unitId, index);
    this.mass[index] = mass;
    this.velocityX[index] = 0;
    this.velocityY[index] = 0;
    this.accelerationX[index] = 0;
    this.accelerationY[index] = 0;
    this.friction[index] = friction;
    this.bounciness[index] = bounciness;
    this.z[index] = 0;

    return index;
  }

  /**
   * Free a physics slot
   */
  free(unitId: string): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.unitIdToIndex.delete(unitId);
    this.freeIndices.push(index);

    this.mass[index] = 1.0;
    this.velocityX[index] = 0;
    this.velocityY[index] = 0;
    this.accelerationX[index] = 0;
    this.accelerationY[index] = 0;
    this.friction[index] = 0.9;
    this.bounciness[index] = 0.5;
    this.z[index] = 0;
  }

  /**
   * Apply force to a unit
   */
  applyForce(unitId: string, forceX: number, forceY: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.accelerationX[index] += forceX / this.mass[index];
    this.accelerationY[index] += forceY / this.mass[index];
  }

  /**
   * Apply force by index (fast path)
   */
  applyForceByIndex(index: number, forceX: number, forceY: number): void {
    this.accelerationX[index] += forceX / this.mass[index];
    this.accelerationY[index] += forceY / this.mass[index];
  }

  /**
   * Apply impulse (instant velocity change)
   */
  applyImpulse(unitId: string, impulseX: number, impulseY: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.velocityX[index] += impulseX / this.mass[index];
    this.velocityY[index] += impulseY / this.mass[index];
  }

  /**
   * Apply impulse by index (fast path)
   */
  applyImpulseByIndex(index: number, impulseX: number, impulseY: number): void {
    this.velocityX[index] += impulseX / this.mass[index];
    this.velocityY[index] += impulseY / this.mass[index];
  }

  /**
   * Update physics simulation for a unit
   */
  updatePhysics(unitId: string, deltaTime: number = 1): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.velocityX[index] += this.accelerationX[index] * deltaTime;
    this.velocityY[index] += this.accelerationY[index] * deltaTime;

    this.velocityX[index] *= this.friction[index];
    this.velocityY[index] *= this.friction[index];

    this.accelerationX[index] = 0;
    this.accelerationY[index] = 0;
  }

  /**
   * Update physics by index (fast path)
   */
  updatePhysicsByIndex(index: number, deltaTime: number = 1): void {
    this.velocityX[index] += this.accelerationX[index] * deltaTime;
    this.velocityY[index] += this.accelerationY[index] * deltaTime;
    this.velocityX[index] *= this.friction[index];
    this.velocityY[index] *= this.friction[index];
    this.accelerationX[index] = 0;
    this.accelerationY[index] = 0;
  }

  /**
   * Get velocity for a unit
   */
  getVelocity(unitId: string): { x: number; y: number } | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;

    return {
      x: this.velocityX[index],
      y: this.velocityY[index],
    };
  }

  /**
   * Set velocity for a unit
   */
  setVelocity(unitId: string, vx: number, vy: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.velocityX[index] = vx;
    this.velocityY[index] = vy;
  }

  /**
   * Get mass for a unit
   */
  getMass(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.mass[index];
  }

  /**
   * Set mass for a unit
   */
  setMass(unitId: string, mass: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;
    this.mass[index] = mass;
  }

  /**
   * Get Z (height) for a unit
   */
  getZ(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.z[index];
  }

  /**
   * Set Z (height) for a unit
   */
  setZ(unitId: string, z: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;
    this.z[index] = z;
  }

  /**
   * Apply gravity to all units
   */
  applyGravity(gravity: number = 9.8): void {
    for (const index of this.unitIdToIndex.values()) {
      if (this.z[index] > 0) {
        this.accelerationY[index] += gravity;
      }
    }
  }

  /**
   * Handle collision between two units
   */
  handleCollision(unitId1: string, unitId2: string): void {
    const index1 = this.unitIdToIndex.get(unitId1);
    const index2 = this.unitIdToIndex.get(unitId2);
    if (index1 === undefined || index2 === undefined) return;

    const m1 = this.mass[index1];
    const m2 = this.mass[index2];
    const v1x = this.velocityX[index1];
    const v1y = this.velocityY[index1];
    const v2x = this.velocityX[index2];
    const v2y = this.velocityY[index2];

    const totalMass = m1 + m2;
    const newV1x = ((m1 - m2) * v1x + 2 * m2 * v2x) / totalMass;
    const newV1y = ((m1 - m2) * v1y + 2 * m2 * v2y) / totalMass;
    const newV2x = ((m2 - m1) * v2x + 2 * m1 * v1x) / totalMass;
    const newV2y = ((m2 - m1) * v2y + 2 * m1 * v1y) / totalMass;

    const bounce1 = this.bounciness[index1];
    const bounce2 = this.bounciness[index2];

    this.velocityX[index1] = newV1x * bounce1;
    this.velocityY[index1] = newV1y * bounce1;
    this.velocityX[index2] = newV2x * bounce2;
    this.velocityY[index2] = newV2y * bounce2;
  }

  /**
   * Get the index for a unit ID
   */
  getIndex(unitId: string): number | undefined {
    return this.unitIdToIndex.get(unitId);
  }

  /**
   * Get raw arrays for direct access (hot path optimization)
   */
  getArrays() {
    return {
      mass: this.mass,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      accelerationX: this.accelerationX,
      accelerationY: this.accelerationY,
      friction: this.friction,
      bounciness: this.bounciness,
      z: this.z,
      unitIdToIndex: this.unitIdToIndex,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.unitIdToIndex.clear();
    this.freeIndices = [];
    this.activeCount = 0;

    for (let i = 0; i < this.capacity; i++) {
      this.mass[i] = 1.0;
      this.velocityX[i] = 0;
      this.velocityY[i] = 0;
      this.accelerationX[i] = 0;
      this.accelerationY[i] = 0;
      this.friction[i] = 0.9;
      this.bounciness[i] = 0.5;
      this.z[i] = 0;
    }
  }
}
