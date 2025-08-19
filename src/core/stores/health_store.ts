/**
 * HealthStore - Component store for unit health data
 * Part of the SoA (Structure of Arrays) architecture refactoring
 *
 * This store manages health-related data for all units efficiently,
 * providing fast access and updates without object allocation.
 */
export class HealthStore {
  private hp: Float32Array;
  private maxHp: Float32Array;
  private dmg: Float32Array;
  private armor: Float32Array;
  private capacity: number;
  private activeCount: number = 0;
  private freeIndices: number[] = [];
  private unitIdToIndex: Map<string, number> = new Map();

  constructor(capacity: number = 10000) {
    this.capacity = capacity;
    this.hp = new Float32Array(capacity);
    this.maxHp = new Float32Array(capacity);
    this.dmg = new Float32Array(capacity);
    this.armor = new Float32Array(capacity);
  }

  /**
   * Allocate a health slot for a unit
   */
  allocate(
    unitId: string,
    hp: number = 100,
    maxHp: number = 100,
    dmg: number = 10,
    armor: number = 0,
  ): number {
    let index: number;

    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
    } else if (this.activeCount < this.capacity) {
      index = this.activeCount++;
    } else {
      throw new Error("HealthStore capacity exceeded");
    }

    this.unitIdToIndex.set(unitId, index);
    this.hp[index] = hp;
    this.maxHp[index] = maxHp;
    this.dmg[index] = dmg;
    this.armor[index] = armor;

    return index;
  }

  /**
   * Free a health slot
   */
  free(unitId: string): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.unitIdToIndex.delete(unitId);
    this.freeIndices.push(index);


    this.hp[index] = 0;
    this.maxHp[index] = 0;
    this.dmg[index] = 0;
    this.armor[index] = 0;
  }

  /**
   * Get health by unit ID
   */
  getHealth(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.hp[index];
  }

  /**
   * Get health by index (fast path)
   */
  getHealthByIndex(index: number): number {
    return this.hp[index];
  }

  /**
   * Set health by unit ID
   */
  setHealth(unitId: string, hp: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;


    this.hp[index] = Math.min(hp, this.maxHp[index]);
  }

  /**
   * Set health by index (fast path)
   */
  setHealthByIndex(index: number, hp: number): void {
    this.hp[index] = Math.min(hp, this.maxHp[index]);
  }

  /**
   * Apply damage to a unit
   */
  applyDamage(unitId: string, damage: number): number {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return 0;


    const effectiveDamage = Math.max(0, damage - this.armor[index]);
    const oldHp = this.hp[index];
    this.hp[index] = Math.max(0, oldHp - effectiveDamage);

    return oldHp - this.hp[index]; // Return actual damage dealt
  }

  /**
   * Apply damage by index (fast path)
   */
  applyDamageByIndex(index: number, damage: number): number {
    const effectiveDamage = Math.max(0, damage - this.armor[index]);
    const oldHp = this.hp[index];
    this.hp[index] = Math.max(0, oldHp - effectiveDamage);
    return oldHp - this.hp[index];
  }

  /**
   * Apply healing to a unit
   */
  applyHealing(unitId: string, healing: number): number {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return 0;

    const oldHp = this.hp[index];
    this.hp[index] = Math.min(this.maxHp[index], oldHp + healing);

    return this.hp[index] - oldHp; // Return actual healing done
  }

  /**
   * Check if unit is alive
   */
  isAlive(unitId: string): boolean {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return false;
    return this.hp[index] > 0;
  }

  /**
   * Check if unit is alive by index (fast path)
   */
  isAliveByIndex(index: number): boolean {
    return this.hp[index] > 0;
  }

  /**
   * Get damage value for a unit
   */
  getDamage(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.dmg[index];
  }

  /**
   * Set damage value for a unit
   */
  setDamage(unitId: string, dmg: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;
    this.dmg[index] = dmg;
  }

  /**
   * Get max health for a unit
   */
  getMaxHealth(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.maxHp[index];
  }

  /**
   * Set max health for a unit
   */
  setMaxHealth(unitId: string, maxHp: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;

    this.maxHp[index] = maxHp;

    if (this.hp[index] > maxHp) {
      this.hp[index] = maxHp;
    }
  }

  /**
   * Get armor value for a unit
   */
  getArmor(unitId: string): number | null {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return null;
    return this.armor[index];
  }

  /**
   * Set armor value for a unit
   */
  setArmor(unitId: string, armor: number): void {
    const index = this.unitIdToIndex.get(unitId);
    if (index === undefined) return;
    this.armor[index] = armor;
  }

  /**
   * Find all units below a health threshold
   */
  findUnitsBelow(threshold: number): string[] {
    const result: string[] = [];

    for (const [unitId, index] of this.unitIdToIndex) {
      if (this.hp[index] < threshold && this.hp[index] > 0) {
        result.push(unitId);
      }
    }

    return result;
  }

  /**
   * Find all dead units
   */
  findDeadUnits(): string[] {
    const result: string[] = [];

    for (const [unitId, index] of this.unitIdToIndex) {
      if (this.hp[index] <= 0) {
        result.push(unitId);
      }
    }

    return result;
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
      hp: this.hp,
      maxHp: this.maxHp,
      dmg: this.dmg,
      armor: this.armor,
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
    this.hp.fill(0);
    this.maxHp.fill(0);
    this.dmg.fill(0);
    this.armor.fill(0);
  }
}
