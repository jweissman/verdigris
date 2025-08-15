import { Unit } from "../types/Unit";
import { Simulator } from "./simulator";

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
   * Get working copy for mutations
   * Now just returns the main units array since we removed double buffering
   */
  private getWorkingCopy(): Unit[] {
    return this.sim.units as Unit[];
  }
  
  /**
   * Commit pending changes - no-op now since changes are applied directly
   */
  commit(): void {
    // No-op - changes are applied directly through proxy manager
  }
  
  /**
   * Filter units (remove some)
   */
  filterUnits(fn: (unit: Unit) => boolean): void {
    // Get all units and find those to remove
    const allUnits = this.sim.units as Unit[];
    const unitsToRemove = allUnits.filter(u => !fn(u));
    
    // Remove each unit efficiently
    for (const unit of unitsToRemove) {
      this.sim.removeUnitById(unit.id);
    }
  }
  
  /**
   * Add a unit
   */
  addUnit(unit: Unit): void {
    this.sim.addUnit(unit);
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
    // Check if unit exists first
    const unit = this.sim.units.find(u => u.id === unitId);
    if (!unit) {
      // Unit doesn't exist yet (might be a segment that's queued for creation)
      // Silently skip the update
      return;
    }
    
    // Mark unit as dirty for delta tracking
    this.sim.markDirty(unitId);
    
    // Use the proxy manager's DataQuery interface to update
    const proxyManager = this.sim.getProxyManager();
    
    // Apply each change through the proper setter
    if (changes.pos !== undefined) proxyManager.setPosition(unitId, changes.pos);
    if (changes.intendedMove !== undefined) proxyManager.setIntendedMove(unitId, changes.intendedMove);
    if (changes.hp !== undefined) proxyManager.setHp(unitId, changes.hp);
    if (changes.maxHp !== undefined) proxyManager.setMaxHp(unitId, changes.maxHp);
    if (changes.team !== undefined) proxyManager.setTeam(unitId, changes.team);
    if (changes.state !== undefined) proxyManager.setState(unitId, changes.state);
    if (changes.mass !== undefined) proxyManager.setMass(unitId, changes.mass);
    if (changes.dmg !== undefined) proxyManager.setDamage(unitId, changes.dmg);
    
    // Cold data
    if (changes.sprite !== undefined) proxyManager.setSprite(unitId, changes.sprite);
    if (changes.abilities !== undefined) proxyManager.setAbilities(unitId, changes.abilities);
    if (changes.tags !== undefined) proxyManager.setTags(unitId, changes.tags);
    if (changes.type !== undefined) proxyManager.setType(unitId, changes.type);
    if (changes.posture !== undefined) proxyManager.setPosture(unitId, changes.posture);
    if (changes.intendedTarget !== undefined) proxyManager.setIntendedTarget(unitId, changes.intendedTarget);
    if (changes.lastAbilityTick !== undefined) proxyManager.setLastAbilityTick(unitId, changes.lastAbilityTick);
    
    // Handle meta specially - merge with existing
    if (changes.meta !== undefined) {
      const existingMeta = proxyManager.getMeta(unitId);
      proxyManager.setMeta(unitId, { ...existingMeta, ...changes.meta });
    }
  }
  
  /**
   * Batch update multiple units at once
   */
  updateUnits(updates: Map<string, Partial<Unit>>): void {
    const units = this.getWorkingCopy();
    let hasChanges = false;
    for (const unit of units) {
      const changes = updates.get(unit.id);
      if (changes) {
        Object.assign(unit, changes);
        hasChanges = true;
      }
    }
    if (hasChanges) {
      this.setUnits(units);
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
    this.sim.projectiles.push(projectile);
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
}