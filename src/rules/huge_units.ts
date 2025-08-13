import { Rule } from "./rule";
import { Unit } from "../types/Unit";

export class HugeUnits extends Rule {
  apply = () => {
    // Find huge units that need phantom setup
    const hugeUnits = this.sim.units.filter(unit => 
      unit.meta.huge && !this.hasPhantoms(unit)
    );

    // Create phantoms for new huge units
    for (const hugeUnit of hugeUnits) {
      this.createPhantoms(hugeUnit);
    }

    // Update phantom positions when parent moves
    this.updatePhantomPositions();

    // Clean up orphaned phantoms
    this.cleanupOrphanedPhantoms();
  }

  private hasPhantoms(hugeUnit: Unit): boolean {
    return this.sim.units.some(unit => 
      unit.meta.phantom && unit.meta.parentId === hugeUnit.id
    );
  }

  private createPhantoms(hugeUnit: Unit) {
    // Create 3 phantom units behind the megasquirrel (1x4 footprint)
    for (let i = 1; i <= 3; i++) {
      const phantomPos = {
        x: hugeUnit.pos.x,
        y: hugeUnit.pos.y + i // Phantoms trail behind in Y direction
      };

      // Check if position is valid (phantoms can push units out of the way)
      if (this.isValidPosition(phantomPos)) {
        const phantom: Unit = {
          id: `${hugeUnit.id}_phantom_${i}`,
          pos: phantomPos,
          intendedMove: { x: 0, y: 0 },
          team: hugeUnit.team,
          sprite: "phantom", // Invisible sprite
          state: "idle",
          hp: 9999, // High HP to prevent accidental death
          maxHp: 9999,
          mass: hugeUnit.mass, // Same mass as parent to push things effectively
          abilities: [],
          tags: ['phantom', 'noncombatant'], // Mark as non-combatant
          meta: {
            phantom: true,
            parentId: hugeUnit.id
          }
        };

        // Queue add command to create the phantom
        this.sim.queuedCommands.push({
          type: 'spawn',
          params: { unit: phantom }
        });
      }
    }
  }

  private updatePhantomPositions() {
    const phantomPairs = this.getPhantomPairs();
    
    for (const [parentId, phantoms] of phantomPairs) {
      const parent = this.sim.units.find(u => u.id === parentId);
      if (!parent || !parent.meta.huge) continue;

      // Update phantom positions relative to parent
      phantoms.forEach((phantom, index) => {
        const expectedPos = {
          x: parent.pos.x,
          y: parent.pos.y + (index + 1)
        };

        // Only move if position changed
        if (phantom.pos.x !== expectedPos.x || phantom.pos.y !== expectedPos.y) {
          // Queue command to move phantom
          this.sim.queuedCommands.push({
            type: 'move',
            params: {
              unitId: phantom.id,
              dx: expectedPos.x - phantom.pos.x,
              dy: expectedPos.y - phantom.pos.y
            }
          });
        }
      });
    }
  }

  private getPhantomPairs(): Map<string, Unit[]> {
    const pairs = new Map<string, Unit[]>();
    
    this.sim.units
      .filter(unit => unit.meta.phantom && unit.meta.parentId)
      .forEach(phantom => {
        const meta = phantom.meta || {};
        const parentId = meta.parentId!;
        if (!pairs.has(parentId)) {
          pairs.set(parentId, []);
        }
        pairs.get(parentId)!.push(phantom);
      });

    // Sort phantoms by position for consistent ordering
    pairs.forEach(phantoms => {
      phantoms.sort((a, b) => a.pos.y - b.pos.y);
    });

    return pairs;
  }

  private cleanupOrphanedPhantoms() {
    const orphanedPhantoms = this.sim.units.filter(unit => {
      const meta = unit.meta || {};
      return meta.phantom && 
             meta.parentId &&
             !this.sim.units.some(parent => parent.id === meta.parentId);
    });

    // Queue commands to remove orphaned phantoms
    for (const phantom of orphanedPhantoms) {
      this.sim.queuedCommands.push({
        type: 'remove',
        params: { unitId: phantom.id }
      });
    }
  }

  private isValidPosition(pos: { x: number, y: number }): boolean {
    return pos.x >= 0 && pos.x < this.sim.fieldWidth &&
           pos.y >= 0 && pos.y < this.sim.fieldHeight;
  }

  private isOccupied(pos: { x: number, y: number }): boolean {
    return this.sim.units.some(unit => 
      unit.pos.x === pos.x && unit.pos.y === pos.y
    );
  }
}