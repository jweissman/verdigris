import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import { Command } from "./command";
import type { QueuedCommand } from "../core/command_handler";

export class AmbientBehavior extends Rule {
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const ambientCreatures = context
      .getAllUnits()
      .filter((u) => u.meta?.isAmbient && u.hp > 0 && u.team === "neutral");

    for (const creature of ambientCreatures) {
      this.updateAmbientBehavior(context, creature, commands);
    }
    // TODO: Implement actual logic
    return commands;
  }

  private updateAmbientBehavior(
    context: TickContext,
    creature: any,
    commands: QueuedCommand[],
  ): void {
    if (!creature.meta.wanderTarget || this.isNearTarget(creature)) {
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
      creature.meta.lastWanderUpdate = context.getCurrentTick();
    }

    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0.5) {
      const speed = 0.3;
      const moveX = (dx / distance) * speed;
      const moveY = (dy / distance) * speed;

      commands.push({
        type: "move",
        params: {
          unitId: creature.id,
          x: creature.pos.x + moveX,
          y: creature.pos.y + moveY,
        },
      });
    }

    if (context.getRandom() < 0.02) {
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
    }

    if (Math.abs(dx) > 0.1) {
      creature.meta.facing = dx > 0 ? "right" : "left";
    }

    this.handleCuteInteractions(context, creature);
  }

  private isNearTarget(creature: any): boolean {
    if (!creature.meta.wanderTarget) return true;

    const target = creature.meta.wanderTarget;
    const dx = target.x - creature.pos.x;
    const dy = target.y - creature.pos.y;
    return Math.sqrt(dx * dx + dy * dy) < 1.0;
  }

  private getNewWanderTarget(
    context: TickContext,
    creature: any,
  ): { x: number; y: number } {
    const margin = 3;
    const maxX = context.getFieldWidth() - margin;
    const maxY = context.getFieldHeight() - margin;

    const centerBias = 0.7;
    const centerX = context.getFieldWidth() / 2;
    const centerY = context.getFieldHeight() / 2;

    let targetX, targetY;

    if (context.getRandom() < centerBias) {
      const radius =
        Math.min(context.getFieldWidth(), context.getFieldHeight()) * 0.3;
      const angle = context.getRandom() * 2 * Math.PI;
      targetX = centerX + Math.cos(angle) * radius * context.getRandom();
      targetY = centerY + Math.sin(angle) * radius * context.getRandom();
    } else {
      targetX = margin + context.getRandom() * (maxX - margin);
      targetY = margin + context.getRandom() * (maxY - margin);
    }

    return {
      x: Math.max(margin, Math.min(maxX, targetX)),
      y: Math.max(margin, Math.min(maxY, targetY)),
    };
  }

  private handleCuteInteractions(context: TickContext, creature: any): void {
    const nearbyAnimals = context
      .getAllUnits()
      .filter(
        (other) =>
          other.id !== creature.id &&
          other.meta?.isAmbient &&
          other.hp > 0 &&
          this.getDistance(creature.pos, other.pos) < 3,
      );

    if (nearbyAnimals.length > 0 && context.getRandom() < 0.05) {
      const friend = nearbyAnimals[0];

      if (creature.type === friend.type) {
        creature.meta.wanderTarget = {
          x: friend.pos.x + (context.getRandom() - 0.5) * 2,
          y: friend.pos.y + (context.getRandom() - 0.5) * 2,
        };
      }
    }

    if (creature.type.includes("squirrel") && context.getRandom() < 0.01) {
      const treeSpot = this.findNearestTreeSpot(context, creature.pos);
      if (treeSpot) {
        creature.meta.wanderTarget = treeSpot;
      }
    }

    if (creature.type === "bird" && context.getRandom() < 0.005) {
      creature.meta.perchTime = context.getCurrentTick() + 50;
      creature.meta.wanderTarget = creature.pos;
    }

    if (
      creature.meta.perchTime &&
      context.getCurrentTick() > creature.meta.perchTime
    ) {
      delete creature.meta.perchTime;
      creature.meta.wanderTarget = this.getNewWanderTarget(context, creature);
    }
  }

  private findNearestTreeSpot(
    context: TickContext,
    pos: { x: number; y: number },
  ): { x: number; y: number } | null {
    const centerX = context.getFieldWidth() / 2;
    const centerY = context.getFieldHeight() / 2;

    return {
      x: centerX + (context.getRandom() - 0.5) * context.getFieldWidth() * 0.5,
      y: centerY + (context.getRandom() - 0.5) * context.getFieldHeight() * 0.5,
    };
  }

  private getDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
