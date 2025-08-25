import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import { Vec2 } from "../types/Vec2";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import { KinematicSolver, GrapplingRope } from "../physics/kinematics";

interface GrappleLineV2 {
  grapplerID: string;
  targetID: string;
  rope: GrapplingRope;
  duration: number;
  maxLength: number;
}

/**
 * Enhanced grappling physics using kinematic rope simulation
 */
export class GrapplingPhysicsV2 extends Rule {
  private grappleLines: Map<string, GrappleLineV2> = new Map();

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    this.handleGrappleCollisions(context, commands);
    this.updateGrappleLines(context, commands);
    this.renderGrappleRopes(context, commands);
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

        const rope = new GrapplingRope(
          grapplerPos,
          hitUnit.pos,
          hitUnit.meta.grappleRange || 10,
        );

        this.grappleLines.set(lineID, {
          grapplerID,
          targetID: hitUnit.id,
          rope,
          duration: hitUnit.meta.pinDuration || 60,
          maxLength: hitUnit.meta.grappleRange || 10,
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
              grappleHit: false,
            },
          },
        });

        const targetMass = hitUnit.mass || 1;
        if (targetMass > 30) {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                pinned: true,
                movementPenalty: 1.0,
              },
            },
          });
        } else {
          commands.push({
            type: "meta",
            params: {
              unitId: hitUnit.id,
              meta: {
                movementPenalty: 0.5,
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
        this.removeGrappleLine(context, lineID, commands);
        continue;
      }

      grappleLine.rope.update(grappler.pos, target.pos);

      if (grappleLine.rope.isTaut()) {
        const pullForce = 0.3 * (target.mass || 1);
        grappleLine.rope.applyPull(pullForce);

        commands.push({
          type: "pull",
          params: {
            grapplerId: grappler.id,
            targetId: target.id,
            force: pullForce,
          },
        });
      }

      grappleLine.duration--;
      if (grappleLine.duration <= 0) {
        this.removeGrappleLine(context, lineID, commands);
      }
    }
  }

  private renderGrappleRopes(context: TickContext, commands: QueuedCommand[]) {
    for (const grappleLine of this.grappleLines.values()) {
      const ropePoints = grappleLine.rope.getRopePoints();
      const isTaut = grappleLine.rope.isTaut();

      for (let i = 0; i < ropePoints.length - 1; i++) {
        const start = ropePoints[i];
        const end = ropePoints[i + 1];

        const segments = 3;
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const x = start.x + (end.x - start.x) * t;
          const y = start.y + (end.y - start.y) * t;

          commands.push({
            type: "particle",
            params: {
              particle: {
                pos: { x: x * 8, y: y * 8 },
                vel: { x: 0, y: 0 },
                radius: isTaut ? 0.8 : 0.6,
                color: isTaut ? "#DD4400" : "#AA6600",
                lifetime: 3,
                type: "grapple_rope",
              },
            },
          });
        }
      }
    }
  }

  private removeGrappleLine(
    context: TickContext,
    lineID: string,
    commands: QueuedCommand[],
  ) {
    const grappleLine = this.grappleLines.get(lineID);
    if (grappleLine) {
      const target = context.findUnitById(grappleLine.targetID);
      if (target) {
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
      }
      this.grappleLines.delete(lineID);
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
      }
    }

    expiredLines.forEach((lineID) =>
      this.removeGrappleLine(context, lineID, commands),
    );
  }
}
