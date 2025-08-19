import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import { Unit } from "../types/Unit";

/**
 * Flying Units Rule
 * Handles flying behavior for birds and other flying creatures
 * - Birds with 'flying' tag can enter flying state
 * - Flying units use frames 5-6 for animation
 * - Flying units can move over obstacles
 * - Birds at field edges stay in flying state
 */
export class FlyingUnits extends Rule {
  private flyingUnits: Set<string> = new Set();
  private animationFrame: number = 0;

  execute(context: TickContext): QueuedCommand[] {
    this.animationFrame = (this.animationFrame + 1) % 60; // Cycle for animation
    const commands: QueuedCommand[] = [];

    for (const unit of context.getAllUnits()) {
      if (unit.tags?.includes("flying")) {
        const unitCommands = this.updateFlyingUnit(context, unit);
        commands.push(...unitCommands);
      }
    }
    return commands;
  }

  private updateFlyingUnit(context: TickContext, unit: Unit): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const shouldFly = this.shouldUnitFly(context, unit);

    if (shouldFly && !this.flyingUnits.has(unit.id)) {
      this.flyingUnits.add(unit.id);
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            flying: true,
            flyingFrame: 5, // Start with frame 5
            z: 3, // Height above ground
          },
        },
      });
    } else if (!shouldFly && this.flyingUnits.has(unit.id)) {
      this.flyingUnits.delete(unit.id);
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            flying: false,
            flyingFrame: undefined,
            z: 0,
          },
        },
      });
    }

    if (this.flyingUnits.has(unit.id)) {
      const frame = Math.floor(this.animationFrame / 15) % 2 === 0 ? 5 : 6;

      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            flyingFrame: frame,
          },
        },
      });

      const hoverOffset = Math.sin(this.animationFrame * 0.1) * 0.2;
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            hoverY: hoverOffset,
          },
        },
      });
    }
    return commands;
  }

  private shouldUnitFly(context: TickContext, unit: Unit): boolean {
    const margin = 2;
    const atEdge =
      unit.pos.x < margin ||
      unit.pos.x > context.getFieldWidth() - margin ||
      unit.pos.y < margin ||
      unit.pos.y > context.getFieldHeight() - margin;

    if (atEdge) return true;

    const isMoving =
      unit.intendedMove &&
      (Math.abs(unit.intendedMove.x) > 0.5 ||
        Math.abs(unit.intendedMove.y) > 0.5);

    if (isMoving) return true;

    if (unit.state === "attack") return true; // Note: "fleeing" is not a valid UnitState

    if (unit.meta.stunned || unit.meta.frozen) return false;

    const randomFlyChance = context.getRandom() < 0.01; // 1% chance per tick

    return unit.meta.flying || randomFlyChance;
  }
}
