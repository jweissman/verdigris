import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Rule } from "./rule";
import type { QueuedCommand } from "./command_handler";
import type { TickContext } from "../core/tick_context";

export class SegmentedCreatures extends Rule {
  private pathHistory: Map<string, Vec2[]> = new Map(); // Track movement history for snake-like following

  constructor() {
    super();
  }

  execute(context: TickContext): QueuedCommand[] {
    const segmentedCreatures = context.getAllUnits().filter((unit) => {
      const meta = unit.meta || {};
      return meta.segmented && !this.hasSegments(context, unit);
    });
    const commands: QueuedCommand[] = [];
    for (let i = 0; i < segmentedCreatures.length; i++) {
      const creature = segmentedCreatures[i];
      if (i > 100) {
        console.error(
          "SegmentedCreatures: Too many creatures, possible infinite loop!",
        );
        throw new Error("SegmentedCreatures infinite loop detected");
      }
      this.createSegments(context, creature, commands);
    }

    this.updateSegmentPositions(context, commands);
    this.handleSegmentDamage(context, commands);
    this.handleSegmentGrappling(context, commands);
    this.cleanupOrphanedSegments(context, commands);
    return commands;
  }

  private hasSegments(context: TickContext, creature: Unit): boolean {
    const hasExistingSegments = context
      .getAllUnits()
      .some((unit) => unit.meta.segment && unit.meta.parentId === creature.id);

    const hasQueuedSegments = false;

    return hasExistingSegments || hasQueuedSegments;
  }

  private createSegments(
    context: TickContext,
    creature: Unit,
    commands: QueuedCommand[],
  ) {
    const segmentCount = creature.meta.segmentCount || 4; // Default to 4 segments

    if (segmentCount > 50) {
      console.error(
        `SegmentedCreatures: Segment count too high: ${segmentCount}`,
      );
      throw new Error("Too many segments requested");
    }

    const initialPath = Array(segmentCount + 2).fill(creature.pos);
    this.pathHistory.set(creature.id, initialPath);

    for (let i = 1; i <= segmentCount; i++) {
      if (i > 100) {
        console.error("SegmentedCreatures: Infinite loop in segment creation!");
        throw new Error("Infinite loop in createSegments");
      }

      let segmentPos = null;
      const attempts = [
        { x: creature.pos.x, y: creature.pos.y + i }, // Behind
        { x: creature.pos.x - i, y: creature.pos.y }, // Left
        { x: creature.pos.x + i, y: creature.pos.y }, // Right
        { x: creature.pos.x, y: creature.pos.y - i }, // Above
        { x: creature.pos.x + 1, y: creature.pos.y + i }, // Diagonal
        { x: creature.pos.x - 1, y: creature.pos.y + i }, // Other diagonal
      ];

      for (const attempt of attempts) {
        if (
          this.isValidPosition(context, attempt) &&
          !this.isOccupied(context, attempt)
        ) {
          segmentPos = attempt;
          break;
        }
      }

      let segmentType: "head" | "body" | "tail";
      if (i === segmentCount) {
        segmentType = "tail";
      } else {
        segmentType = "body";
      }

      if (segmentPos) {
        let segmentSprite = creature.sprite;
        if (creature.meta.useCustomSegmentSprites) {
          const baseSprite = creature.sprite.replace("-head", "");
          segmentSprite = `${baseSprite}-${segmentType}`;
        }

        const segment: Unit = {
          id: `${creature.id}_segment_${i}`,
          pos: segmentPos,
          intendedMove: { x: 0, y: 0 },
          team: creature.team,
          sprite: segmentSprite,
          state: "idle",
          hp: Math.floor(creature.hp * 0.7), // Segments have less HP than head
          maxHp: Math.floor(creature.maxHp * 0.7),
          mass: creature.mass,
          abilities: [],
          tags: ["segment", "noncombatant"],
          meta: {
            segment: true,
            segmentType,
            segmentIndex: i,
            parentId: creature.id,
            facing: creature.meta.facing || "right",

            width: creature.meta.width,
            height: creature.meta.height,
          },
        };

        commands.push({
          type: "spawn",
          params: { unit: segment },
        });
      }
    }
  }

  private getSegmentSprite(
    segmentType: "head" | "body" | "tail",
    parentCreature?: Unit,
  ): string {
    if (parentCreature?.meta.useCustomSegmentSprites) {
      const baseSprite = parentCreature.sprite.replace("-head", "");
      switch (segmentType) {
        case "head":
          return `${baseSprite}-head`;
        case "body":
          return `${baseSprite}-body`;
        case "tail":
          return `${baseSprite}-tail`;
        default:
          return `${baseSprite}-body`;
      }
    }

    switch (segmentType) {
      case "head":
        return "worm";
      case "body":
        return "worm";
      case "tail":
        return "worm";
      default:
        return "worm";
    }
  }

  private updateSegmentPositions(
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    const segmentGroups = this.getSegmentGroups(context);
    const units = context.getAllUnits();

    for (const [parentId, segments] of segmentGroups) {
      const parent = units.find((u) => u.id === parentId);
      if (!parent || !parent.meta.segmented) continue;

      let pathHistory = this.pathHistory.get(parentId) || [];

      pathHistory.unshift({ ...parent.pos });

      const maxPathLength = (parent.meta.segmentCount || 4) + 5;
      if (pathHistory.length > maxPathLength) {
        pathHistory = pathHistory.slice(0, maxPathLength);
      }

      this.pathHistory.set(parentId, pathHistory);

      segments.forEach((segment, index) => {
        const pathIndex = segment.meta.segmentIndex || index + 1;

        if (pathIndex < pathHistory.length) {
          const targetPos = pathHistory[pathIndex];

          if (segment.pos.x !== targetPos.x || segment.pos.y !== targetPos.y) {
            const dx = targetPos.x - segment.pos.x;
            const dy = targetPos.y - segment.pos.y;

            commands.push({
              type: "move",
              params: {
                unitId: segment.id,
                dx: dx,
                dy: dy,
              },
            });
          }
        }
      });
    }
  }

  private getSegmentGroups(context: TickContext): Map<string, Unit[]> {
    const groups = new Map<string, Unit[]>();
    const units = context.getAllUnits();

    units
      .filter((unit) => unit.meta.segment && unit.meta.parentId)
      .forEach((segment) => {
        const parentId = segment.meta.parentId!;
        if (!groups.has(parentId)) {
          groups.set(parentId, []);
        }
        groups.get(parentId)!.push(segment);
      });

    groups.forEach((segments) => {
      segments.sort(
        (a, b) => (a.meta.segmentIndex || 0) - (b.meta.segmentIndex || 0),
      );
    });

    return groups;
  }

  private cleanupOrphanedSegments(
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    const orphanedSegments = context
      .getAllUnits()
      .filter(
        (unit) =>
          unit.meta.segment &&
          unit.meta.parentId &&
          !context
            .getAllUnits()
            .some((parent) => parent.id === unit.meta.parentId),
      );

    if (orphanedSegments.length > 0) {
      for (const segment of orphanedSegments) {
        if (segment.meta.parentId) {
          this.pathHistory.delete(segment.meta.parentId);
        }

        commands.push({
          type: "remove",
          params: { unitId: segment.id },
        });
      }
    }
  }

  private handleSegmentDamage(context: TickContext, commands: QueuedCommand[]) {
    context
      .getAllUnits()
      .filter((unit) => unit.meta.segment)
      .forEach((segment) => {
        if (segment.meta.damageTaken && segment.meta.parentId) {
          const parent = context
            .getAllUnits()
            .find((u) => u.id === segment.meta.parentId);
          if (parent) {
            const transferDamage = Math.floor(segment.meta.damageTaken * 0.5);
            if (transferDamage > 0) {
              // Use damage command to properly apply damage to parent
              commands.push({
                type: "damage",
                params: {
                  targetId: parent.id,
                  amount: transferDamage,
                  aspect: "physical",
                  sourceId: "segment_transfer",
                },
              });

              commands.push({
                type: "particle",
                params: {
                  particle: {
                    pos: { x: parent.pos.x * 8 + 4, y: parent.pos.y * 8 + 4 },
                    vel: { x: 0, y: -0.5 },
                    radius: 2,
                    color: "#FF0000",
                    lifetime: 15,
                    type: "pain",
                  },
                },
              });
            }
            // Clear the damage taken flag
            segment.meta.damageTaken = undefined;
          }
        }

        if (segment.hp <= 0 && segment.meta.segmentIndex) {
          const adjacentSegments = context
            .getAllUnits()
            .filter(
              (u) =>
                u.meta.segment &&
                u.meta.parentId === segment.meta.parentId &&
                Math.abs(
                  (u.meta.segmentIndex || 0) - segment.meta.segmentIndex,
                ) === 1,
            );

          adjacentSegments.forEach((adj) => {
            if (adj.id) {
              commands.push({
                type: "damage",
                params: {
                  unitId: adj.id,
                  damage: 5,
                  source: "segment_damage",
                },
              });
            }
          });
        }
      });
  }

  private handleSegmentGrappling(
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    const units = context.getAllUnits();

    units
      .filter((unit) => unit.meta.segment)
      .forEach((segment) => {
        if (segment.meta.grappled || segment.meta.pinned) {
          const parent = units.find((u) => u.id === segment.meta.parentId);
          if (parent) {
            const grappledSegments = units.filter(
              (u) =>
                u.meta.segment &&
                u.meta.parentId === parent.id &&
                (u.meta.grappled || u.meta.pinned),
            ).length;

            const speedPenalty = Math.min(0.8, grappledSegments * 0.2); // Max 80% slow

            const originalSpeed =
              parent.meta.originalSpeed || parent.meta.moveSpeed || 1.0;
            commands.push({
              type: "meta",
              params: {
                unitId: parent.id,
                meta: {
                  segmentSlowdown: speedPenalty,
                  originalSpeed: originalSpeed,
                  moveSpeed: originalSpeed * (1 - speedPenalty),
                },
              },
            });

            if (segment.meta.segmentIndex === 1 && segment.meta.pinned) {
              commands.push({
                type: "meta",
                params: {
                  unitId: parent.id,
                  meta: {
                    stunned: true,
                  },
                },
              });
              commands.push({
                type: "halt",
                params: { unitId: parent.id },
              });
            }
          }
        }
      });

    units
      .filter((unit) => unit.meta.segmented)
      .forEach((creature) => {
        const grappledSegments = units.filter(
          (u) =>
            u.meta.segment &&
            u.meta.parentId === creature.id &&
            (u.meta.grappled || u.meta.pinned),
        ).length;

        if (grappledSegments === 0 && creature.meta.segmentSlowdown) {
          commands.push({
            type: "meta",
            params: {
              unitId: creature.id,
              meta: {
                segmentSlowdown: undefined,
                moveSpeed: creature.meta.originalSpeed || 1.0,
                originalSpeed: undefined,
                stunned: false,
              },
            },
          });
        }
      });
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
    return context
      .getAllUnits()
      .some((unit) => unit.pos.x === pos.x && unit.pos.y === pos.y);
  }
}
