import { Unit } from "../types/Unit";
import { Projectile } from "../types/Projectile";
import { Action } from "../types/Action";
import { Simulator } from "./simulator";

/**
 * Transform object that provides controlled mutation access
 * Implements true double buffering - accumulate all changes then commit once
 */
export class Transform {
  private sim: Simulator;
  private workingUnits: Unit[] | null = null;
  
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
   * - During frame: use pending buffer
   * - Outside frame: use current buffer (for tests)
   */
  private getWorkingCopy(): Unit[] {
    // If we're in a frame, work on pending buffer
    // Otherwise work on current buffer (for tests that don't use frames)
    if ((this.sim as any).inFrame) {
      return this.sim.getPendingUnits();
    } else {
      // Not in frame - work directly on current units
      return (this.sim as any).currentBuffer === 'A' ? (this.sim as any).bufferA : (this.sim as any).bufferB;
    }
  }
  
  /**
   * Set all units (complete replacement)
   */
  setUnits(units: Unit[]): void {
    // Don't set directly - the units are already in the pending buffer
    // The buffer swap will happen at endFrame
  }
  
  /**
   * Commit pending changes - write working copy back to simulator
   * This is the ONLY place units are actually written back
   */
  commit(): void {
    if (this.workingUnits !== null) {
      this.sim.setUnitsFromTransform(this.workingUnits);
      this.workingUnits = null;
    }
  }
  
  /**
   * Transform all units with a mapping function
   * Works on the working copy
   */
  mapUnits(fn: (unit: Unit) => Unit): void {
    const units = this.getWorkingCopy();
    for (let i = 0; i < units.length; i++) {
      units[i] = fn(units[i]);
    }
    this.setUnits(units);
  }
  
  /**
   * Filter units (remove some)
   */
  filterUnits(fn: (unit: Unit) => boolean): void {
    const units = this.getWorkingCopy();
    // Filter in place by removing units that don't match
    for (let i = units.length - 1; i >= 0; i--) {
      if (!fn(units[i])) {
        units.splice(i, 1);
      }
    }
  }
  
  /**
   * Add a unit
   */
  addUnit(unit: Unit): void {
    const units = this.getWorkingCopy();
    units.push(unit);
    // No need to call setUnits - we're mutating the pending buffer directly
  }
  
  /**
   * Remove a unit by ID
   */
  removeUnit(unitId: string): void {
    this.filterUnits(u => u.id !== unitId);
  }
  
  /**
   * Update a specific unit - more efficient than mapUnits for single updates
   */
  updateUnit(unitId: string, changes: Partial<Unit>): void {
    const units = this.getWorkingCopy();
    const unit = units.find(u => u.id === unitId);
    if (unit) {
      // Merge metadata properly if updating meta
      if (changes.meta && unit.meta) {
        changes.meta = { ...unit.meta, ...changes.meta };
      }
      Object.assign(unit, changes);
      // No need to call setUnits - we're mutating the pending buffer directly
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