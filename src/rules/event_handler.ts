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
      damage: (e) =>
        `${e.source} hit ${e.target} for ${e.meta.amount} ${e.meta.aspect} damage (now at ${targetUnit?.hp} hp)`,
      heal: (e) =>
        `${e.source} healed ${e.target} for ${e.meta.amount} (now at ${targetUnit?.hp} hp)`,
      terrain: (e) =>
        `${e.source} modified terrain at (${e.target?.x}, ${e.target?.y}): ${e.meta.terrainType}`,
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
    if (
      !event.target ||
      typeof event.target !== "object" ||
      !("x" in event.target && "y" in event.target)
    ) {
      console.warn(`Invalid target for AoE event: ${event.target}`);
      return;
    }
    let target = event.target as Vec2;
    target.x = Math.round(target.x);
    target.y = Math.round(target.y);

    let sourceUnit = context.findUnitById(event.source as string);

    const isHealing = event.meta.aspect === "heal";
    const isEmp = event.meta.aspect === "emp";
    const isChill = event.meta.aspect === "chill";

    const affectedUnits = context.getAllUnits().filter((unit) => {
      const dx = unit.pos.x - target.x;
      const dy = unit.pos.y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inRange = distance <= (event.meta.radius || 5);

      if (isHealing) {
        return (
          inRange && unit.team === sourceUnit?.team && unit.hp < unit.maxHp
        );
      } else if (isEmp) {
        const mechanicalImmune =
          event.meta.mechanicalImmune && unit.tags?.includes("mechanical");
        return inRange && !mechanicalImmune;
      } else if (isChill) {
        return inRange && unit.team !== sourceUnit?.team; // Chill affects enemies
      } else {
        const friendlyFire = event.meta.friendlyFire !== false; // Default to true for backwards compatibility
        if (!friendlyFire) {
          return inRange && sourceUnit && unit.team !== sourceUnit.team;
        } else {
          return inRange && unit.id !== event.source;
        }
      }
    });

    for (const unit of affectedUnits) {
      const distance = Math.sqrt(
        Math.pow(unit.pos.x - target.x, 2) + Math.pow(unit.pos.y - target.y, 2),
      );

      if (isEmp) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              stunned: true,
              stunDuration: event.meta.stunDuration || 20,
            },
          },
        });

        commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
              vel: { x: 0, y: -0.3 },
              radius: 2,
              color: "#FFFF88",
              lifetime: 25,
              type: "electric_spark",
            },
          },
        });
      } else if (isChill) {
        commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              chilled: true,
              chillIntensity: 0.5, // 50% slow
              chillDuration: event.meta.duration || 30,
            },
          },
        });
      } else if (isHealing) {
        context.queueEvent({
          kind: "heal",
          source: event.source,
          target: unit.id,
          meta: {
            amount: event.meta.amount || 10,
            aspect: "magic",
            origin: event.target,
          },
        });
      } else {
        const falloff = event.meta.falloff !== false;
        const maxRadius = event.meta.radius || 5;
        const damageMultiplier = falloff
          ? Math.max(0.3, 1 - (distance / maxRadius) * 0.5)
          : 1;
        const damage = Math.floor((event.meta.amount || 10) * damageMultiplier);

        if (damage > 0) {
          commands.push({
            type: "damage",
            params: {
              targetId: unit.id,
              amount: damage,
              aspect: event.meta.aspect || "explosion",
              sourceId: event.source,
              origin: event.target,
            },
          });
        }

        if (event.meta.force && sourceUnit) {
          const massDiff = (sourceUnit.mass || 1) - (unit.mass || 1);
          if (massDiff >= 3) {
            const dx = unit.pos.x - target.x;
            const dy = unit.pos.y - target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const direction = { x: dx / dist, y: dy / dist };
              commands.push({
                type: "toss",
                unitId: unit.id,
                params: {
                  direction: direction,
                  force: event.meta.force,
                  distance: Math.min(3, event.meta.force / 2),
                },
              });
            }
          }
        }
      }
    }

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

    commands.push({
      type: "damage",
      params: {
        targetId: targetUnit.id,
        amount: event.meta.amount,
        aspect: event.meta.aspect || "physical",
        sourceId: event.source,
        origin: event.meta.origin,
      },
    });

    const origin = event.meta.origin || targetUnit.pos;
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

    commands.push({
      type: "heal",
      params: {
        targetId: targetUnit.id,
        amount: event.meta.amount,
      },
    });

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
