/**
 * Lightweight Unit Proxy System
 *
 * Units become lightweight proxies that read from underlying storage.
 * This enables:
 * 1. Double buffering (read from A, write to B)
 * 2. Structure of Arrays optimization
 * 3. Controlled mutation through Transform layer
 */

import { Unit } from "../types/Unit";

/**
 * Storage interface that can be backed by different implementations
 * (Array of Structures, Structure of Arrays, etc.)
 */
export interface UnitStorage {
  getUnit(id: string): Unit | undefined;
  getField<K extends keyof Unit>(id: string, field: K): Unit[K] | undefined;
  setField<K extends keyof Unit>(id: string, field: K, value: Unit[K]): void;
  getAllUnits(): readonly Unit[];
  addUnit(unit: Unit): void;
  removeUnit(id: string): void;
  clone(): UnitStorage;
}

/**
 * Simple AoS (Array of Structures) storage - what we currently have
 */
export class ArrayStorage implements UnitStorage {
  private units: Map<string, Unit> = new Map();

  getUnit(id: string): Unit | undefined {
    return this.units.get(id);
  }

  getField<K extends keyof Unit>(id: string, field: K): Unit[K] | undefined {
    const unit = this.units.get(id);
    return unit ? unit[field] : undefined;
  }

  setField<K extends keyof Unit>(id: string, field: K, value: Unit[K]): void {
    const unit = this.units.get(id);
    if (unit) {
      unit[field] = value;
    }
  }

  getAllUnits(): readonly Unit[] {
    return Array.from(this.units.values());
  }

  addUnit(unit: Unit): void {
    this.units.set(unit.id, { ...unit }); // Store a copy
  }

  removeUnit(id: string): void {
    this.units.delete(id);
  }

  clone(): UnitStorage {
    const newStorage = new ArrayStorage();
    for (const [id, unit] of this.units) {
      newStorage.units.set(id, { ...unit });
    }
    return newStorage;
  }
}

/**
 * Unit Proxy - lightweight object that reads from storage
 */
export class UnitProxy implements Unit {
  constructor(
    private storage: UnitStorage,
    public readonly id: string,
  ) {}

  get pos() {
    return this.storage.getField(this.id, "pos") || { x: 0, y: 0 };
  }

  set pos(value) {
    this.storage.setField(this.id, "pos", value);
  }

  get intendedMove() {
    return this.storage.getField(this.id, "intendedMove") || { x: 0, y: 0 };
  }

  set intendedMove(value) {
    this.storage.setField(this.id, "intendedMove", value);
  }

  get team() {
    return this.storage.getField(this.id, "team") || "neutral";
  }

  set team(value) {
    this.storage.setField(this.id, "team", value);
  }

  get sprite() {
    return this.storage.getField(this.id, "sprite") || "";
  }

  set sprite(value) {
    this.storage.setField(this.id, "sprite", value);
  }

  get state() {
    return this.storage.getField(this.id, "state") || "idle";
  }

  set state(value) {
    this.storage.setField(this.id, "state", value);
  }

  get hp() {
    return this.storage.getField(this.id, "hp") || 0;
  }

  set hp(value) {
    this.storage.setField(this.id, "hp", value);
  }

  get maxHp() {
    return this.storage.getField(this.id, "maxHp") || this.hp;
  }

  set maxHp(value) {
    this.storage.setField(this.id, "maxHp", value);
  }

  get mass() {
    return this.storage.getField(this.id, "mass") || 1;
  }

  set mass(value) {
    this.storage.setField(this.id, "mass", value);
  }

  get abilities() {
    return this.storage.getField(this.id, "abilities") || [];
  }

  set abilities(value) {
    this.storage.setField(this.id, "abilities", value);
  }

  get tags() {
    return this.storage.getField(this.id, "tags") || [];
  }

  set tags(value) {
    this.storage.setField(this.id, "tags", value);
  }

  get meta() {
    return this.storage.getField(this.id, "meta") || {};
  }

  set meta(value) {
    this.storage.setField(this.id, "meta", value);
  }

  get posture() {
    return this.storage.getField(this.id, "posture");
  }

  set posture(value) {
    this.storage.setField(this.id, "posture", value);
  }

  get dmg() {
    return this.storage.getField(this.id, "dmg");
  }

  set dmg(value) {
    this.storage.setField(this.id, "dmg", value);
  }



















  get lastAbilityTick() {
    return this.storage.getField(this.id, "lastAbilityTick");
  }

  set lastAbilityTick(value) {
    this.storage.setField(this.id, "lastAbilityTick", value);
  }

  get type() {
    return this.storage.getField(this.id, "type");
  }

  set type(value) {
    this.storage.setField(this.id, "type", value);
  }










  get intendedTarget() {
    return this.storage.getField(this.id, "intendedTarget");
  }

  set intendedTarget(value) {
    this.storage.setField(this.id, "intendedTarget", value);
  }

  get intendedProtectee() {
    return this.storage.getField(this.id, "intendedProtectee");
  }

  set intendedProtectee(value) {
    this.storage.setField(this.id, "intendedProtectee", value);
  }

  toJSON() {
    return this.storage.getUnit(this.id);
  }
}

/**
 * Manages the proxy layer and double buffering
 */
export class UnitProxyManager {
  private readStorage: UnitStorage;
  private writeStorage: UnitStorage | null = null;
  private proxies: Map<string, UnitProxy> = new Map();

  constructor(initialStorage?: UnitStorage) {
    this.readStorage = initialStorage || new ArrayStorage();
  }

  /**
   * Begin a new frame - create write buffer
   */
  beginFrame(): void {
    this.writeStorage = this.readStorage.clone();

    this.proxies.clear();
  }

  /**
   * Commit the frame - swap buffers
   */
  commitFrame(): void {
    if (this.writeStorage) {
      this.readStorage = this.writeStorage;
      this.writeStorage = null;
    }
  }

  /**
   * Get a unit proxy for reading/writing
   */
  getUnit(id: string): UnitProxy | undefined {
    const storage = this.writeStorage || this.readStorage;

    if (!storage.getUnit(id)) {
      return undefined;
    }

    if (!this.proxies.has(id)) {
      this.proxies.set(id, new UnitProxy(storage, id));
    }

    return this.proxies.get(id);
  }

  /**
   * Get all units as proxies
   */
  getAllUnits(): UnitProxy[] {
    const storage = this.writeStorage || this.readStorage;
    const units = storage.getAllUnits();

    return units.map((u) => {
      if (!this.proxies.has(u.id)) {
        this.proxies.set(u.id, new UnitProxy(storage, u.id));
      }
      return this.proxies.get(u.id)!;
    });
  }

  /**
   * Add a new unit
   */
  addUnit(unit: Unit): void {
    const storage = this.writeStorage || this.readStorage;
    storage.addUnit(unit);
  }

  /**
   * Remove a unit
   */
  removeUnit(id: string): void {
    const storage = this.writeStorage || this.readStorage;
    storage.removeUnit(id);
    this.proxies.delete(id);
  }

  /**
   * Get the underlying storage (for optimized operations)
   */
  getStorage(): UnitStorage {
    return this.writeStorage || this.readStorage;
  }
}
