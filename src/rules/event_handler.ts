import { Action } from "../types/Action";
import { Vec2 } from "../types/Vec2";
import { Rule } from "./rule";
import type { QueuedCommand } from "../core/command_handler";
import type { TickContext } from "../core/tick_context";

export class EventHandler extends Rule {
  constructor() {
    super();
  }

  glossary = (event: Action, context: TickContext) => {
    let targetUnit = context.findUnitById(event.target as string);
    let tx = {
      aoe: (e) => {
        const type = e.meta.aspect === "heal" ? "Healing circle" : "Impact";
        return `${type} from ${e.source} at (${e.target.x}, ${e.target.y}) with radius ${e.meta.radius}`;
      },
      damage: (e) => {
        const origin = e.meta?.origin
          ? ` from (${e.meta.origin.x}, ${e.meta.origin.y})`
          : "";
        return `${e.source} hit ${e.target} for ${e.meta.amount} ${e.meta.aspect} damage${origin} (now at ${targetUnit?.hp} hp)`;
      },
      heal: (e) =>
        `${e.source} healed ${e.target} for ${e.meta.amount} (now at ${targetUnit?.hp} hp)`,
      terrain: (e) =>
        `${e.source} formed ${e.meta.terrainType} at (${e.target?.x}, ${e.target?.y})`,
      particle: (e) =>
        `${e.source} created a particle effect at (${e.target?.x}, ${e.target?.y})`,
      moisture: (e) =>
        `${e.source} changed moisture at (${e.target?.x}, ${e.target?.y}) by ${e.meta.amount}`,
      spawn: (e) =>
        `${e.source} spawned a unit at (${e.target?.x}, ${e.target?.y})`,
    };
    if (!tx.hasOwnProperty(event.kind)) {
      return `Event: ${event.kind} from ${event.source} to ${event.target}`;
    }
    return tx[event.kind](event);
  };

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const queuedEvents = context.getQueuedEvents();
    if (queuedEvents.length === 0) {
      return commands;
    }

    for (const event of queuedEvents) {
      if ((event as any)._processed) {
        continue;
      }

      (event as any)._processed = true;

      // Log event for debugging
      if (typeof window !== "undefined") {
        console.log(`[Event] ${this.glossary(event, context)}`);
      }

      switch (event.kind) {
        case "aoe":
          this.handleAreaOfEffect(event, context, commands);
          break;
        case "damage":
          this.handleDamage(event, context, commands);
          break;
        case "heal":
          this.handleHeal(event, context, commands);
          break;
        case "knockback":
          this.handleKnockback(event, context, commands);
          break;
        case "spawn":
          this.handleSpawn(event, context, commands);
          break;
        case "terrain":
          this.handleTerrain(event, context, commands);
          break;
        case "particle":
          break;
        case "moisture":
          break;
        default:
          console.warn(`Unknown event kind: ${event.kind}`);
      }
    }

    return commands;
  }

  private handleSpawn(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (
      !event.target ||
      typeof event.target !== "object" ||
      !("x" in event.target && "y" in event.target)
    ) {
      console.warn(`Invalid target for spawn event: ${event.target}`);
      return;
    }

    if (!event.meta.unit) {
      console.warn("Spawn event missing unit data");
      return;
    }

    const newUnit = {
      ...event.meta.unit,
      pos: { x: event.target.x, y: event.target.y },
      id: event.meta.unit?.id || `spawned_${Date.now()}`,
    };

    commands.push({
      type: "spawn",
      params: { unit: newUnit },
    });
  }

  private handleParticle(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (!event.meta) return;

    if (!event.meta.pos || !event.meta.vel) {
      console.error("Particle event missing pos or vel:", event);
      return;
    }

    commands.push({
      type: "particle",
      params: { particle: event.meta },
    });
  }

  private handleAreaOfEffect(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    // Events are purely informational - only create visual particles, not gameplay effects
    if (
      !event.target ||
      typeof event.target !== "object" ||
      !("x" in event.target && "y" in event.target)
    ) {
      return;
    }

    const target = event.target as Vec2;
    const isHealing = event.meta?.aspect === "heal";
    const isEmp = event.meta?.aspect === "emp";
    const isChill = event.meta?.aspect === "chill";

    const particleCount = isHealing ? 12 : 20;
    const particleColor = isHealing
      ? "#88FF88"
      : isEmp
        ? "#FFFF88"
        : isChill
          ? "#88DDFF"
          : "#FF8844";

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = isHealing ? 0.5 : 1.5;
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: target.x * 8 + 4, y: target.y * 8 + 4 },
            vel: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed,
            },
            radius: 2,
            color: particleColor,
            lifetime: 25,
            type: isHealing ? "heal_particle" : "explosion",
          },
        },
      });
    }
  }

  private handleDamage(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (!event.target || !event.meta?.amount) {
      return;
    }

    const targetUnit = context.findUnitById(event.target as string);
    if (!targetUnit) {
      return;
    }

    const aspect = event.meta.aspect || "physical";
    for (let i = 0; i < 5; i++) {
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: {
              x: (context.getRandom() - 0.5) * 2,
              y: -context.getRandom() * 2,
            },
            radius: 1.5,
            color: aspect === "fire" ? "#FF6644" : "#FF4444",
            lifetime: 15,
            type: "damage",
          },
        },
      });
    }
  }

  private handleHeal(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (!event.target || !event.meta?.amount) {
      return;
    }

    const targetUnit = context.findUnitById(event.target as string);
    if (!targetUnit) {
      return;
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: targetUnit.pos.x * 8 + 4, y: targetUnit.pos.y * 8 + 4 },
            vel: {
              x: Math.cos(angle) * 0.3,
              y: Math.sin(angle) * 0.3 - 0.5,
            },
            radius: 1.5,
            color: "#88FF88",
            lifetime: 20,
            type: "heal",
          },
        },
      });
    }
  }

  private handleKnockback(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (!event.target || !event.meta?.direction) {
      return;
    }

    const targetUnit = context.findUnitById(event.target as string);
    if (!targetUnit) {
      return;
    }

    const force = event.meta.force || 5;
    const direction = event.meta.direction;

    commands.push({
      type: "knockback",
      params: {
        unitId: targetUnit.id,
        direction: direction,
        force: force,
      },
    });
  }

  private handleTerrain(
    event: Action,
    context: TickContext,
    commands: QueuedCommand[],
  ) {
    if (event.meta?.terrainType) {
    }
  }
}
