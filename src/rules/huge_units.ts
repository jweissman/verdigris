import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export class HugeUnits extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const allUnits = context.getAllUnits();

    const hugeUnits = allUnits.filter(
      (unit) => unit.meta.huge && !this.hasPhantoms(allUnits, unit),
    );

    for (const hugeUnit of hugeUnits) {
      this.createPhantoms(context, hugeUnit, commands);
    }

    this.updatePhantomPositions(context, allUnits, commands);

    this.cleanupOrphanedPhantoms(context, allUnits, commands);

    return commands;
  }

  private hasPhantoms(allUnits: readonly Unit[], hugeUnit: Unit): boolean {
    return allUnits.some(
      (unit) => unit.meta.phantom && unit.meta.parentId === hugeUnit.id,
    );
  }

  private createPhantoms(context: TickContext, hugeUnit: Unit, commands: QueuedCommand[]) {
    for (let i = 1; i <= 3; i++) {
      const phantomPos = {
        x: hugeUnit.pos.x,
        y: hugeUnit.pos.y + i, // Phantoms trail behind in Y direction
      };

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
          tags: ["phantom", "noncombatant"], // Mark as non-combatant
          meta: {
            phantom: true,
            parentId: hugeUnit.id,
          },
        };

        commands.push({
          type: "spawn",
          params: { unit: phantom },
        });
      }
    }
  }

  private updatePhantomPositions(
    context: TickContext,
    allUnits: readonly Unit[],
    commands: QueuedCommand[]
  ) {
    const phantomPairs = this.getPhantomPairs(allUnits);

    for (const [parentId, phantoms] of phantomPairs) {
      const parent = context.findUnitById(parentId);
      if (!parent || !parent.meta.huge) continue;

      phantoms.forEach((phantom, index) => {
        const expectedPos = {
          x: parent.pos.x,
          y: parent.pos.y + (index + 1),
        };

        if (
          phantom.pos.x !== expectedPos.x ||
          phantom.pos.y !== expectedPos.y
        ) {
          commands.push({
            type: "move",
            params: {
              unitId: phantom.id,
              dx: expectedPos.x - phantom.pos.x,
              dy: expectedPos.y - phantom.pos.y,
            },
          });
        }
      });
    }
  }

  private getPhantomPairs(allUnits: readonly Unit[]): Map<string, Unit[]> {
    const pairs = new Map<string, Unit[]>();

    allUnits
      .filter((unit) => unit.meta.phantom && unit.meta.parentId)
      .forEach((phantom) => {
        const meta = phantom.meta || {};
        const parentId = meta.parentId!;
        if (!pairs.has(parentId)) {
          pairs.set(parentId, []);
        }
        pairs.get(parentId)!.push(phantom);
      });

    pairs.forEach((phantoms) => {
      phantoms.sort((a, b) => a.pos.y - b.pos.y);
    });

    return pairs;
  }

  private cleanupOrphanedPhantoms(
    context: TickContext,
    allUnits: readonly Unit[],
    commands: QueuedCommand[]
  ) {
    const orphanedPhantoms = allUnits.filter((unit) => {
      const meta = unit.meta || {};
      return (
        meta.phantom && meta.parentId && !context.findUnitById(meta.parentId)
      );
    });

    for (const phantom of orphanedPhantoms) {
      commands.push({
        type: "remove",
        params: { unitId: phantom.id },
      });
    }
  }

  private isValidPosition(
    context: TickContext,
    pos: { x: number; y: number },
  ): boolean {
    return (
      pos.x >= 0 &&
      pos.x < context.getFieldWidth() &&
      pos.y >= 0 &&
      pos.y < context.getFieldHeight()
    );
  }

  private isOccupied(
    context: TickContext,
    pos: { x: number; y: number },
  ): boolean {
    return context.getUnitsAt(pos).length > 0;
  }
}
