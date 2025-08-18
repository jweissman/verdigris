import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import { Projectile } from "../types/Projectile";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

interface GrappleLine {
  grapplerID: string;
  targetID: string;
  startPos: Vec2;
  endPos: Vec2;
  length: number;
  taut: boolean;
  pinned: boolean;
  duration: number;
}

export class GrapplingPhysics extends Rule {
  private grappleLines: Map<string, GrappleLine> = new Map();

  constructor() {
    super();
  }

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    this.handleGrappleCollisions(context, commands);

    this.updateGrappleLines(context, commands);

    this.applyPinningEffects(context, commands);

    this.cleanupExpiredGrapples(context, commands);

    return commands;
  }

  private handleGrappleCollisions(
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    const allUnits = context.getAllUnits();

    for (const unit of allUnits) {
      if (unit.meta.grappleHit) {
        this.processGrappleHit(context, unit, commands);
      }
    }
  }

  private processGrappleHit(
    context: TickContext,
    hitUnit: Unit,
    commands: QueuedCommand[],
  ) {
    if (hitUnit.meta.grappleHit) {
      const grapplerID = hitUnit.meta.grapplerID || "unknown";
      const grappler = context.findUnitById(grapplerID);

      const grapplerPos =
        grappler?.pos || hitUnit.meta.grappleOrigin || hitUnit.pos;

      if (grapplerPos) {
        const lineID = `${grapplerID}_${hitUnit.id}`;
        const distance = this.calculateDistance(grapplerPos, hitUnit.pos);

        this.grappleLines.set(lineID, {
          grapplerID,
          targetID: hitUnit.id,
          startPos: { ...grapplerPos },
          endPos: { ...hitUnit.pos },
          length: distance,
          taut: true,
          pinned: false,
          duration: hitUnit.meta.pinDuration || 60,
        });

        commands.push({
          type: "meta",
          params: {
            unitId: hitUnit.id,
            meta: {
              grappled: true,
              grappledBy: grapplerID,
              grappledDuration: hitUnit.meta.pinDuration || 60,
              tetherPoint: grapplerPos,
              grappleHit: false, // Clear the hit flag by setting to false
            },
          },
        });

        if (grappler) {
          commands.push({
            type: "meta",
            params: {
              unitId: grappler.id,
              meta: {
                grapplingTarget: hitUnit.id,
              },
            },
          });
        }

        if (hitUnit.meta.segmented) {
          const firstSegment = context
            .getAllUnits()
            .find(
              (u) =>
                u.meta.segment &&
                u.meta.parentId === hitUnit.id &&
                u.meta.segmentIndex === 1,
            );

          if (firstSegment && firstSegment.hp > 0) {
            const damage = 5; // Base grapple damage to segments

            commands.push({
              type: "damage",
              params: {
                targetId: firstSegment.id,
                amount: damage,
              },
            });

            commands.push({
              type: "meta",
              params: {
                unitId: firstSegment.id,
                meta: {
                  pinned: true,
                  pinDuration: 30,
                },
              },
            });
          }
        }

        const targetMass = hitUnit.mass || 1;
        if (targetMass > 30) {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                pinned: true,
                movementPenalty: 1.0, // 100% movement reduction
              },
            },
          });
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                movementPenalty: 0.5, // 50% slower
              },
            },
          });
        }
      }
    }
  }

  private updateGrappleLines(context: TickContext, commands: QueuedCommand[]) {
    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      const grappler = context.findUnitById(grappleLine.grapplerID);
      const target = context.findUnitById(grappleLine.targetID);

      if (!grappler || !target || grappler.hp <= 0 || target.hp <= 0) {
        this.removeGrappleLine(context, lineID);
        continue;
      }

      grappleLine.startPos = { ...grappler.pos };
      grappleLine.endPos = { ...target.pos };

      const currentDistance = this.calculateDistance(grappler.pos, target.pos);
      const maxDistance = grappleLine.length + 2; // Allow some slack
      const releaseDistance = 0.5; // Release when dragged very close (within 0.5 cells)

      if (currentDistance < releaseDistance) {
        this.grappleLines.delete(lineID);

        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              grappled: false,
              grappledBy: undefined,
              grappledDuration: 0,
              tetherPoint: undefined,
              movementPenalty: 0,
              pinned: false,
            },
          },
        });

        continue; // Skip to next grapple line
      }

      grappleLine.taut = currentDistance >= grappleLine.length;

      const targetMass = target.mass || 1;
      if (targetMass > 30) {
        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              pinned: true,
              movementPenalty: 1.0,
            },
          },
        });
      } else {
        if (!target.meta.movementPenalty) {
          commands.push({
            type: "meta",
            params: {
              unitId: target.id,
              meta: {
                movementPenalty: 0.5,
              },
            },
          });
        }
      }

      if (grappleLine.taut && currentDistance > releaseDistance) {
        this.applyTautEffects(context, grappler, target, grappleLine, commands);
      }

      grappleLine.duration--;
      if (target.meta.grappledDuration) {
        commands.push({
          type: "meta",
          params: {
            unitId: target.id,
            meta: {
              grappledDuration: (target.meta.grappledDuration || 1) - 1,
            },
          },
        });
      }
    }

    this.renderGrappleLines(context, commands);
  }

  private applyTautEffects(
    context: TickContext,
    grappler: Unit,
    target: Unit,
    _grappleLine: GrappleLine,
    commands: QueuedCommand[],
  ) {
    commands.push({
      type: "pull",
      params: {
        grapplerId: grappler.id,
        targetId: target.id,
        force: 0.3,
      },
    });

    const targetMass = target.mass || 1;
    if (targetMass > 30 && !target.meta.pinned) {
      commands.push({
        type: "meta",
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            movementPenalty: 1.0,
          },
        },
      });
    }
  }

  private applyPinningEffects(context: TickContext, commands: QueuedCommand[]) {
    for (const unit of context.getAllUnits()) {
      if (!unit.meta) continue;

      if (unit.meta.grappled && unit.meta.grappledDuration > 0) {
        if (unit.meta.movementPenalty) {
          unit.intendedMove.x *= 1 - unit.meta.movementPenalty;
          unit.intendedMove.y *= 1 - unit.meta.movementPenalty;
        }
      } else if (unit.meta.grappled && unit.meta.grappledDuration <= 0) {
        const wasPinned = unit.meta.pinned;
        this.removeGrappleFromUnit(unit);
        if (wasPinned && (unit.mass || 1) > 30) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: { pinned: true },
            },
          });
        }
      }

      if (unit.meta.pinned && unit.meta.pinDuration > 0) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              pinDuration: unit.meta.pinDuration - 1,
            },
          },
        });
        commands.push({
          type: "halt",
          params: { unitId: unit.id },
        });
      } else if (unit.meta.pinned && !unit.meta.pinDuration) {
        if ((unit.mass || 1) > 30 && unit.meta.grappled) {
          commands.push({
            type: "halt",
            params: { unitId: unit.id },
          });
        } else {
          this.removePinFromUnit(unit);
        }
      }
    }
  }

  private cleanupExpiredGrapples(
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    const expiredLines: string[] = [];

    for (const [lineID, grappleLine] of this.grappleLines.entries()) {
      if (grappleLine.duration <= 0) {
        expiredLines.push(lineID);

        const target = context.findUnitById(grappleLine.targetID);
        if (target) {
          this.removeGrappleFromUnit(target);
        }
      }
    }

    expiredLines.forEach((lineID) => this.grappleLines.delete(lineID));
  }

  private renderGrappleLines(context: TickContext, commands: QueuedCommand[]) {
    for (const grappleLine of this.grappleLines.values()) {
      const numSegments = Math.floor(grappleLine.length) + 2;

      for (let i = 1; i < numSegments; i++) {
        const t = i / numSegments;
        const x =
          grappleLine.startPos.x +
          (grappleLine.endPos.x - grappleLine.startPos.x) * t;
        const y =
          grappleLine.startPos.y +
          (grappleLine.endPos.y - grappleLine.startPos.y) * t;

        const sag = Math.sin(t * Math.PI) * (grappleLine.taut ? 0.1 : 0.3);

        commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: x * 8, y: (y + sag) * 8 },
              vel: { x: 0, y: 0 },
              radius: grappleLine.taut ? 0.8 : 0.5,
              color: grappleLine.pinned ? "#DD4400" : "#AA6600", // Red when pinned, brown when grappled
              lifetime: 100, // Longer lifetime for rope climbing to work
              type: "grapple_line",
            },
          },
        });
      }
    }
  }

  private removeGrappleLine(context: TickContext, lineID: string) {
    const grappleLine = this.grappleLines.get(lineID);
    if (grappleLine) {
      const target = context.findUnitById(grappleLine.targetID);
      if (target) {
        this.removeGrappleFromUnit(target);
      }
      this.grappleLines.delete(lineID);
    }
  }

  private removeGrappleFromUnit(unit: Unit) {
    if (unit.meta) {
      delete unit.meta.grappled;
      delete unit.meta.grappledBy;
      delete unit.meta.grappledDuration;
      delete unit.meta.movementPenalty;
    }
  }

  private removePinFromUnit(unit: Unit) {
    if (unit.meta) {
      delete unit.meta.pinned;
      delete unit.meta.pinDuration;
      delete unit.meta.stunned;
    }
  }

  private calculateDistance(pos1: Vec2, pos2: Vec2): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private clampToField(context: TickContext, unit: Unit) {
    const newX = Math.max(0, Math.min(context.getFieldWidth() - 1, unit.pos.x));
    const newY = Math.max(
      0,
      Math.min(context.getFieldHeight() - 1, unit.pos.y),
    );

    unit.pos.x = newX;
    unit.pos.y = newY;
  }
}
