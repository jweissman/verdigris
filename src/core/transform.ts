import { Unit } from "../types/Unit";
import { Projectile } from "../types/Projectile";
import { Action } from "../types/Action";
import { Simulator } from "./simulator";

/**
 * Transform object that provides controlled mutation access
 * Only specific parts of the system should have access to this
 */
export class Transform {
  private sim: Simulator;
  private pendingUnits: Unit[] | null = null;
  
  constructor(simulator: Simulator) {
    this.sim = simulator;
  }
  
  /**
   * Get read-only access to units
   */
  get units(): ReadonlyArray<Readonly<Unit>> {
    return this.sim.getUnitsForTransform();
  }
  
  /**
   * Set all units (complete replacement)
   * With double buffering - write to pending buffer
   */
  setUnits(units: Unit[]): void {
    this.pendingUnits = units;
  }
  
  /**
   * Commit pending changes (swap buffers)
   */
  commit(): void {
    if (this.pendingUnits !== null) {
      this.sim.setUnitsFromTransform(this.pendingUnits);
      this.pendingUnits = null;
    }
  }
  
  /**
   * Transform all units with a mapping function
   * ACTUALLY accumulates changes on pending buffer
   */
  mapUnits(fn: (unit: Unit) => Unit): void {
    // Always work on the latest state - either pending or current
    const currentUnits = this.pendingUnits || [...this.sim.getUnitsForTransform()];
    // Map the function over current state
    this.pendingUnits = currentUnits.map(fn);
  }
  
  /**
   * Filter units (remove some)
   * Works on pending buffer if available
   */
  filterUnits(fn: (unit: Unit) => boolean): void {
    const currentUnits = this.pendingUnits || this.sim.getUnitsForTransform();
    this.pendingUnits = currentUnits.filter(fn);
  }
  
  /**
   * Add a unit
   */
  addUnit(unit: Unit): void {
    const units = [...this.sim.getUnitsForTransform(), unit];
    this.setUnits(units);
  }
  
  /**
   * Remove a unit by ID
   */
  removeUnit(unitId: string): void {
    this.filterUnits(u => u.id !== unitId);
  }
  
  /**
   * Update a specific unit
   */
  updateUnit(unitId: string, changes: Partial<Unit>): void {
    this.mapUnits(u => {
      if (u.id === unitId) {
        return { ...u, ...changes };
      }
      return u;
    });
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