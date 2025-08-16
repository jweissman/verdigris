/**
 * Mutation Collector - Batches mutations for efficient application
 * Based on DOUBLE_BUFFER_MIGRATION_PLAN.md recommendations
 */

import { Unit } from "../types/Unit";

export type MutationType = "update" | "add" | "remove";

export interface UnitMutation {
  type: MutationType;
  unitId?: string;
  changes?: Partial<Unit>;
  unit?: Unit;
}

/**
 * Collects mutations during a simulation frame
 * Applies them in batch for performance
 */
export class MutationCollector {
  private mutations: UnitMutation[] = [];

  /**
   * Queue an update to a unit
   */
  updateUnit(unitId: string, changes: Partial<Unit>): void {
    this.mutations.push({
      type: "update",
      unitId,
      changes,
    });
  }

  /**
   * Queue addition of a new unit
   */
  addUnit(unit: Unit): void {
    this.mutations.push({
      type: "add",
      unit,
    });
  }

  /**
   * Queue removal of a unit
   */
  removeUnit(unitId: string): void {
    this.mutations.push({
      type: "remove",
      unitId,
    });
  }

  /**
   * Apply all mutations to a unit array
   * Returns new array to maintain immutability if needed
   */
  applyTo(units: Unit[]): Unit[] {
    let result = [...units];

    for (const mutation of this.mutations) {
      switch (mutation.type) {
        case "update":
          const index = result.findIndex((u) => u.id === mutation.unitId);
          if (index !== -1 && mutation.changes) {
            result[index] = { ...result[index], ...mutation.changes };
          }
          break;

        case "add":
          if (mutation.unit) {
            result.push(mutation.unit);
          }
          break;

        case "remove":
          result = result.filter((u) => u.id !== mutation.unitId);
          break;
      }
    }

    return result;
  }

  /**
   * Apply mutations using a Transform object
   * This is the preferred approach for isolation
   */
  applyViaTransform(transform: any): void {
    for (const mutation of this.mutations) {
      switch (mutation.type) {
        case "update":
          if (mutation.unitId && mutation.changes) {
            transform.updateUnit(mutation.unitId, mutation.changes);
          }
          break;

        case "add":
          if (mutation.unit) {
            transform.addUnit(mutation.unit);
          }
          break;

        case "remove":
          if (mutation.unitId) {
            transform.removeUnit(mutation.unitId);
          }
          break;
      }
    }
  }

  /**
   * Get mutation count
   */
  get count(): number {
    return this.mutations.length;
  }

  /**
   * Clear all mutations
   */
  clear(): void {
    this.mutations = [];
  }

  /**
   * Get all mutations (for debugging/inspection)
   */
  getMutations(): readonly UnitMutation[] {
    return this.mutations;
  }
}
