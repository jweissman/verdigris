import { Rule } from "./rule";
import { Simulator } from "../core/simulator";
import { Vec2 } from "../types/Vec2";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class LightningStorm extends Rule {
  private commands: QueuedCommand[] = [];

  constructor() {
    super();
  }

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const sim = (context as any).sim;
    if (!sim?.lightningActive) return;

    const currentTick = context.getCurrentTick();
    const strikeInterval = 8; // Base interval between strikes

    if (currentTick % strikeInterval === 0) {
      const seed = currentTick * 31;
      const x = seed % context.getFieldWidth();
      const y = (seed * 17) % context.getFieldHeight();

      this.commands.push({
        type: "bolt",
        params: { x, y },
      });
    }

    this.updateLightningEffects(context);

    return this.commands;
  }

  public generateLightningStrike(context: TickContext, targetPos?: Vec2): void {
    const strikePos = targetPos || {
      x: Math.floor(context.getRandom() * context.getFieldWidth()),
      y: Math.floor(context.getRandom() * context.getFieldHeight()),
    };

    this.createLightningVisuals(context, strikePos);
    this.createEmpBurst(context, strikePos);
    this.boostMechanicalUnits(context, strikePos);
    this.createAtmosphericEffects(context, strikePos);
  }

  private createLightningVisuals(context: TickContext, pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    for (let i = 0; i < 8; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: pixelX + (context.getRandom() - 0.5) * 3,
              y: pixelY - i * 4,
            },
            vel: { x: 0, y: 0 },
            radius: 1 + context.getRandom() * 2,
            color: i < 2 ? "#FFFFFF" : i < 4 ? "#CCCCFF" : "#8888FF",
            lifetime: 8 + context.getRandom() * 4, // Brief but intense
            type: "lightning",
          },
        },
      });
    }

    for (let branch = 0; branch < 4; branch++) {
      const branchAngle = context.getRandom() * Math.PI * 2;
      const branchLength = 2 + context.getRandom() * 3;

      for (let i = 0; i < branchLength; i++) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: pixelX + Math.cos(branchAngle) * i * 8,
                y: pixelY + Math.sin(branchAngle) * i * 8,
              },
              vel: { x: 0, y: 0 },
              radius: 0.5 + context.getRandom(),
              color: "#AAAAFF",
              lifetime: 6 + context.getRandom() * 3,
              type: "lightning_branch",
            },
          },
        });
      }
    }

    for (let i = 0; i < 12; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: (context.getRandom() - 0.5) * 2,
              y: (context.getRandom() - 0.5) * 2,
            },
            radius: 0.5,
            color: "#CCCCFF",
            lifetime: 15 + context.getRandom() * 10,
            type: "electric_spark",
          },
        },
      });
    }
  }

  private createEmpBurst(context: TickContext, pos: Vec2): void {
    // Apply stun to units in radius
    const radius = 3;
    const stunDuration = 20;

    const affectedUnits = context.getAllUnits().filter((unit) => {
      const dx = unit.pos.x - pos.x;
      const dy = unit.pos.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const inRange = distance <= radius;
      const mechanicalImmune = unit.tags?.includes("mechanical");
      return inRange && !mechanicalImmune && unit.hp > 0;
    });

    for (const unit of affectedUnits) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            stunned: true,
            stunDuration: stunDuration,
          },
        },
      });

      // Visual particle effect
      this.commands.push({
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
    }

    // Still queue the event for informational purposes
    context.queueEvent({
      kind: "aoe",
      source: "lightning",
      target: pos,
      meta: {
        aspect: "emp",
        radius: radius,
        stunDuration: stunDuration,
        amount: 0, // No damage, just stun effect
        mechanicalImmune: true,
      },
    });
  }

  private boostMechanicalUnits(context: TickContext, pos: Vec2): void {
    const mechanicalUnits = context
      .getAllUnits()
      .filter(
        (unit) =>
          unit.tags?.includes("mechanical") &&
          Math.abs(unit.pos.x - pos.x) <= 4 &&
          Math.abs(unit.pos.y - pos.y) <= 4 &&
          unit.hp > 0,
      );

    mechanicalUnits.forEach((unit) => {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            lightningBoost: true,
            lightningBoostDuration: 60, // 7.5 seconds of boost
          },
        },
      });

      if (unit.lastAbilityTick) {
        Object.keys(unit.lastAbilityTick).forEach((abilityName) => {
          let t: number = context.getCurrentTick();
          const ticksSinceUse = t - (unit.lastAbilityTick![abilityName] || 0);
          const boostAmount = Math.floor(ticksSinceUse * 0.5);
          unit.lastAbilityTick![abilityName] = Math.max(
            0,
            (unit.lastAbilityTick![abilityName] || 0) - boostAmount,
          );
        });
      }

      if (unit.tags?.includes("leader") || unit.tags?.includes("engineer")) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: { lightningBoostDuration: 90 }, // Extended boost for leaders
          },
        });

        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: unit.pos.y * 8 + 4 },
              vel: { x: 0, y: -1 },
              radius: 3,
              color: "#FFFF00",
              lifetime: 30,
              type: "power_surge",
            },
          },
        });
      }
    });
  }

  private createAtmosphericEffects(context: TickContext, pos: Vec2): void {
    const pixelX = pos.x * 8 + 4;
    const pixelY = pos.y * 8 + 4;

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 2 + context.getRandom();

      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: { x: pixelX, y: pixelY },
            vel: {
              x: Math.cos(angle) * 0.5,
              y: Math.sin(angle) * 0.5,
            },
            radius: radius,
            color: "#444488",
            lifetime: 20 + context.getRandom() * 15,
            type: "thunder_ring",
          },
        },
      });
    }

    for (let i = 0; i < 6; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: pixelX + (context.getRandom() - 0.5) * 16,
              y: pixelY + (context.getRandom() - 0.5) * 16,
            },
            vel: { x: 0, y: -0.1 },
            radius: 1,
            color: "#6666AA",
            lifetime: 40 + context.getRandom() * 20,
            type: "ozone",
          },
        },
      });
    }
  }

  private updateLightningEffects(context: TickContext): void {
    context.getAllUnits().forEach((unit) => {
      if (unit.meta.lightningBoostDuration) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              lightningBoostDuration: unit.meta.lightningBoostDuration - 1,
            },
          },
        });

        if (unit.meta.lightningBoostDuration <= 1) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                lightningBoost: undefined,
                lightningBoostDuration: undefined,
              },
            },
          });
        }
      }
    });
  }

  static createLightningStorm(sim: Simulator): void {
    sim.lightningActive = true;

    for (let i = 0; i < 8; i++) {
      sim.particles.push({
        pos: {
          x: Simulator.rng.random() * sim.fieldWidth * 8,
          y: Simulator.rng.random() * sim.fieldHeight * 8,
        },
        vel: { x: (Simulator.rng.random() - 0.5) * 0.2, y: -0.1 },
        radius: 0.5,
        color: "#333366",
        lifetime: 120 + Simulator.rng.random() * 60,
        type: "storm_cloud",
      });
    }
  }

  static endLightningStorm(sim: Simulator): void {
    sim.lightningActive = false;
  }
}
