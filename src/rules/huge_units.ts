import { Rule } from "./rule";
import { Unit } from "../sim/types";

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
    // console.log(`Creating phantoms for huge unit: ${hugeUnit.id}`);
    
    // Create 3 phantom units behind the megasquirrel (1x4 footprint)
    for (let i = 1; i <= 3; i++) {
      const phantomPos = {
        x: hugeUnit.pos.x,
        y: hugeUnit.pos.y + i // Phantoms trail behind in Y direction
      };

      // Check if position is valid and not occupied
      if (this.isValidPosition(phantomPos) && !this.isOccupied(phantomPos)) {
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
          abilities: {},
          tags: ['phantom', 'noncombatant'], // Mark as non-combatant
          meta: {
            phantom: true,
            parentId: hugeUnit.id
          }
        };

        this.sim.addUnit(phantom);
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
          // console.log(`Updating phantom ${phantom.id} from (${phantom.pos.x},${phantom.pos.y}) to (${expectedPos.x},${expectedPos.y})`);
          phantom.pos = expectedPos;
        }
      });
    }
  }

  private getPhantomPairs(): Map<string, Unit[]> {
    const pairs = new Map<string, Unit[]>();
    
    this.sim.units
      .filter(unit => unit.meta.phantom && unit.meta.parentId)
      .forEach(phantom => {
        const parentId = phantom.meta.parentId!;
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
    const orphanedPhantoms = this.sim.units.filter(unit => 
      unit.meta.phantom && 
      unit.meta.parentId &&
      !this.sim.units.some(parent => parent.id === unit.meta.parentId)
    );

    // Remove orphaned phantoms
    for (const phantom of orphanedPhantoms) {
      console.log(`Removing orphaned phantom: ${phantom.id}`);
      this.sim.units = this.sim.units.filter(u => u.id !== phantom.id);
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