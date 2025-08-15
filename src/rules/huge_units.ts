import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";

export class HugeUnits extends Rule {
  execute(context: TickContext): void {
    // Find huge units that need phantom setup
    const hugeUnits = context.getAllUnits().filter(unit => 
      unit.meta.huge && !this.hasPhantoms(context, unit)
    );

    // Create phantoms for new huge units
    for (const hugeUnit of hugeUnits) {
      this.createPhantoms(context, hugeUnit);
    }

    // Update phantom positions when parent moves
    this.updatePhantomPositions(context);

    // Clean up orphaned phantoms
    this.cleanupOrphanedPhantoms(context);
  }

  private hasPhantoms(context: TickContext, hugeUnit: Unit): boolean {
    return context.getAllUnits().some(unit => 
      unit.meta.phantom && unit.meta.parentId === hugeUnit.id
    );
  }

  private createPhantoms(context: TickContext, hugeUnit: Unit) {
    // Create 3 phantom units behind the megasquirrel (1x4 footprint)
    for (let i = 1; i <= 3; i++) {
      const phantomPos = {
        x: hugeUnit.pos.x,
        y: hugeUnit.pos.y + i // Phantoms trail behind in Y direction
      };

      // Check if position is valid (phantoms can push units out of the way)
      if (this.isValidPosition(context, phantomPos)) {
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
        context.queueCommand({
          type: 'spawn',
          params: { unit: phantom }
        });
      }
    }
  }

  private updatePhantomPositions(context: TickContext) {
    const phantomPairs = this.getPhantomPairs(context);
    
    for (const [parentId, phantoms] of phantomPairs) {
      const parent = context.findUnitById(parentId);
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
          context.queueCommand({
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

  private getPhantomPairs(context: TickContext): Map<string, Unit[]> {
    const pairs = new Map<string, Unit[]>();
    
    context.getAllUnits()
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

  private cleanupOrphanedPhantoms(context: TickContext) {
    const orphanedPhantoms = context.getAllUnits().filter(unit => {
      const meta = unit.meta || {};
      return meta.phantom && 
             meta.parentId &&
             !context.findUnitById(meta.parentId);
    });

    // Queue commands to remove orphaned phantoms
    for (const phantom of orphanedPhantoms) {
      context.queueCommand({
        type: 'remove',
        params: { unitId: phantom.id }
      });
    }
  }

  private isValidPosition(context: TickContext, pos: { x: number, y: number }): boolean {
    return pos.x >= 0 && pos.x < context.getFieldWidth() &&
           pos.y >= 0 && pos.y < context.getFieldHeight();
  }

  private isOccupied(context: TickContext, pos: { x: number, y: number }): boolean {
    return context.getUnitsAt(pos).length > 0;
  }
}