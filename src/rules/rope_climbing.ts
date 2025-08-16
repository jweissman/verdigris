import { Rule } from "./rule";
import { Unit, Vec2 } from "../types/";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

interface GrappleLine {
  grapplerID: string;
  targetID: string;
  startPos: Vec2;
  endPos: Vec2;
}

/**
 * Rope Climbing Mechanics
 * Allows units with canClimbGrapples to move along existing grapple lines
 */
export class RopeClimbing extends Rule {
  private sim: any; // Keep for particle access

  constructor(sim: any) {
    super();
    this.sim = sim;
  }

  execute(context: TickContext): QueuedCommand[] {
    const climbers = context
      .getAllUnits()
      .filter((u) => u.meta.canClimbGrapples && !u.meta.climbingLine);

    // TODO: Should get particles through context
    const grappleLineParticles =
      this.sim.particles?.filter((p) => p.type === "grapple_line") || [];

    if (grappleLineParticles.length === 0) return;

    const lines = this.reconstructGrappleLines(grappleLineParticles);

    for (const climber of climbers) {
      const nearbyLine = this.findNearbyGrappleLine(climber, lines);

      if (nearbyLine) {
        this.attachToGrappleLine(context, climber, nearbyLine);
      }
    }

    this.updateClimbers(context);
    const commands: QueuedCommand[] = [];
    return commands;
  }

  private reconstructGrappleLines(particles: any[]): GrappleLine[] {
    const lines: GrappleLine[] = [];

    let currentLine: Vec2[] = [];

    for (const particle of particles) {
      currentLine.push({ x: particle.pos.x / 8, y: particle.pos.y / 8 });

      if (currentLine.length >= 5) {
        lines.push({
          grapplerID: "unknown", // Would need to track this in particle metadata
          targetID: "unknown",
          startPos: currentLine[0],
          endPos: currentLine[currentLine.length - 1],
        });
        currentLine = [];
      }
    }

    return lines;
  }

  private findNearbyGrappleLine(
    climber: Unit,
    lines: GrappleLine[],
  ): GrappleLine | null {
    const threshold = 2; // Units away from line to attach

    for (const line of lines) {
      const distToLine = this.distanceToLineSegment(
        climber.pos,
        line.startPos,
        line.endPos,
      );

      if (distToLine < threshold) {
        return line;
      }
    }

    return null;
  }

  private distanceToLineSegment(point: Vec2, start: Vec2, end: Vec2): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
      return Math.sqrt(
        Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2),
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      ),
    );

    const projection = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    return Math.sqrt(
      Math.pow(point.x - projection.x, 2) + Math.pow(point.y - projection.y, 2),
    );
  }

  private attachToGrappleLine(
    context: TickContext,
    climber: Unit,
    line: GrappleLine,
  ): void {
    commands.push({
      type: "meta",
      params: {
        unitId: climber.id,
        meta: {
          climbingLine: true,
          lineStart: line.startPos,
          lineEnd: line.endPos,
          climbProgress: 0, // 0 = at start, 1 = at end
          climbDirection: 1, // 1 = toward end, -1 = toward start
        },
      },
    });
  }

  private updateClimbers(context: TickContext): void {
    const climbingUnits = context
      .getAllUnits()
      .filter((u) => u.meta.climbingLine);

    for (const climber of climbingUnits) {
      const climbSpeed = 0.05; // Progress per tick
      const newProgress =
        climber.meta.climbProgress + climbSpeed * climber.meta.climbDirection;

      if (newProgress >= 1 || newProgress <= 0) {
        commands.push({
          type: "meta",
          params: {
            unitId: climber.id,
            meta: {
              climbingLine: false,
              lineStart: undefined,
              lineEnd: undefined,
              climbProgress: undefined,
              climbDirection: undefined,
            },
          },
        });
      } else {
        const start = climber.meta.lineStart;
        const end = climber.meta.lineEnd;
        const newX = start.x + (end.x - start.x) * newProgress;
        const newY = start.y + (end.y - start.y) * newProgress;

        commands.push({
          type: "move",
          params: {
            unitId: climber.id,
            x: newX,
            y: newY,
          },
        });

        commands.push({
          type: "meta",
          params: {
            unitId: climber.id,
            meta: {
              climbProgress: newProgress,
            },
          },
        });
      }
    }
  }
}
