import { Unit } from "../types/Unit";
import { Simulator } from "./simulator";
import { Action } from "../types/Action";
import { Projectile } from "../types/Projectile";
import Encyclopaedia from "../dmg/encyclopaedia";

/**
 * Transform object that provides controlled mutation access
 */
export class Transform {
  private sim: Simulator;

  constructor(simulator: Simulator) {
    this.sim = simulator;
  }

  /**
   * Get units for reading - returns current state
   */
  get units(): ReadonlyArray<Readonly<Unit>> {
    return this.sim.units;
  }

  /**
   * Get projectiles for reading
   */
  get projectiles(): readonly Projectile[] {
    return this.sim.projectiles;
  }

  /**
   * Get working copy for mutations
   * Now just returns the main units array since we removed double buffering
   */
  private getWorkingCopy(): Unit[] {
    return this.sim.units as Unit[];
  }

  /**
   * Commit pending changes - no-op now since changes are applied directly
   */
  commit(): void {}

  /**
   * Filter units (remove some)
   */
  filterUnits(fn: (unit: Unit) => boolean): void {
    const allUnits = this.sim.units as Unit[];
    const unitsToRemove = allUnits.filter((u) => !fn(u));

    for (const unit of unitsToRemove) {
      this.sim.removeUnitById(unit.id);
    }
  }

  /**
   * Add a unit
   */
  addUnit(unit: Partial<Unit>): Unit {
    return this.sim.addUnit(unit);
  }

  /**
   * Remove a unit by ID
   */
  removeUnit(unitId: string): void {
    this.sim.removeUnitById(unitId);
  }

  /**
   * Update a specific unit - more efficient than mapUnits for single updates
   */
  updateUnit(unitId: string, changes: Partial<Unit>): void {
    const unit = this.sim.units.find((u) => u.id === unitId);
    if (!unit) {
      return;
    }

    this.sim.markDirty(unitId);

    const proxyManager = this.sim.getProxyManager();

    if (changes.pos !== undefined)
      proxyManager.setPosition(unitId, changes.pos);
    if (changes.intendedMove !== undefined)
      proxyManager.setIntendedMove(unitId, changes.intendedMove);
    if (changes.hp !== undefined) proxyManager.setHp(unitId, changes.hp);
    if (changes.maxHp !== undefined)
      proxyManager.setMaxHp(unitId, changes.maxHp);
    if (changes.team !== undefined) proxyManager.setTeam(unitId, changes.team);
    if (changes.state !== undefined)
      proxyManager.setState(unitId, changes.state);
    if (changes.mass !== undefined) proxyManager.setMass(unitId, changes.mass);
    if (changes.dmg !== undefined) proxyManager.setDamage(unitId, changes.dmg);

    if (changes.sprite !== undefined)
      proxyManager.setSprite(unitId, changes.sprite);
    if (changes.abilities !== undefined)
      proxyManager.setAbilities(unitId, changes.abilities);
    if (changes.tags !== undefined) proxyManager.setTags(unitId, changes.tags);
    if (changes.type !== undefined) proxyManager.setType(unitId, changes.type);
    if (changes.posture !== undefined)
      proxyManager.setPosture(unitId, changes.posture);
    if (changes.intendedTarget !== undefined)
      proxyManager.setIntendedTarget(unitId, changes.intendedTarget);
    if (changes.lastAbilityTick !== undefined)
      proxyManager.setLastAbilityTick(unitId, changes.lastAbilityTick);

    if (changes.meta !== undefined) {
      const existingMeta = proxyManager.getMeta(unitId);
      const newMeta = { ...existingMeta };

      for (const [key, value] of Object.entries(changes.meta)) {
        if (value === undefined) {
          delete newMeta[key];
        } else {
          newMeta[key] = value;
        }
      }

      proxyManager.setMeta(unitId, newMeta);
    }
  }

  /**
   * Batch update multiple units at once
   */
  updateUnits(updates: Map<string, Partial<Unit>>): void {
    const units = this.getWorkingCopy();
    for (const unit of units) {
      const changes = updates.get(unit.id);
      if (changes) {
        Object.assign(unit, changes);
      }
    }
  }

  /**
   * Queue an event
   */
  queueEvent(event: Action): void {
    this.sim.queuedEvents.push(event);
  }

  /**
   * Add a projectile
   */
  addProjectile(projectile: Projectile): void {
    this.sim.projectileArrays.addProjectile(projectile);
    this.sim.invalidateProjectilesCache();
  }

  /**
   * Remove a projectile by ID
   */
  removeProjectileById(id: string): void {
    this.sim.projectileArrays.removeProjectileById(id);
    this.sim.invalidateProjectilesCache();
  }

  /**
   * Remove a projectile by index
   */
  removeProjectileByIndex(index: number): void {
    this.sim.projectileArrays.removeProjectile(index);
    this.sim.invalidateProjectilesCache();
  }

  /**
   * Clear all projectiles
   */
  clearProjectiles(): void {
    this.sim.projectileArrays.clear();
    this.sim.invalidateProjectilesCache();
  }

  /**
   * Transform projectiles
   */
  mapProjectiles(fn: (projectile: Projectile) => Projectile): void {
    this.sim.projectiles = this.sim.projectiles.map(fn);
  }

  /**
   * Filter projectiles
   */
  filterProjectiles(fn: (projectile: Projectile) => boolean): void {
    this.sim.projectiles = this.sim.projectiles.filter(fn);
  }

  /**
   * Set weather conditions
   */
  setWeather(type: string, duration: number, intensity: number): void {
    this.sim.setWeather(type, duration, intensity);
  }
}
