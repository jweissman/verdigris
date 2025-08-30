import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export interface StatusEffect {
  type: "chill" | "stun" | "burn" | "poison" | "freeze";
  duration: number;
  intensity: number;
  source?: string;
}

export class StatusEffects extends Rule {
  private commands: QueuedCommand[] = [];

  constructor() {
    super();
  }

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    // console.log("StatusEffects rule executing...");

    for (const unit of context.getAllUnits()) {
      if (unit.meta.chillTrigger) {
        this.applyChillFromTrigger(context, unit);
      }

      // Handle frozen status countdown
      if (
        unit.meta.frozen &&
        unit.meta.frozenDuration !== undefined &&
        unit.meta.frozenDuration > 0
      ) {
        const newDuration = unit.meta.frozenDuration - 1;
        if (newDuration <= 0) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                frozen: undefined,
                frozenDuration: undefined,
                stunned: undefined,
              },
            },
          });
        } else {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                frozenDuration: newDuration,
              },
            },
          });
        }

        // Prevent movement when frozen
        if (unit.intendedMove) {
          this.commands.push({
            type: "halt",
            params: { unitId: unit.id },
          });
        }
      }

      // Handle old-style stunDuration countdown
      if (
        unit.meta.stunned &&
        unit.meta.stunDuration !== undefined &&
        unit.meta.stunDuration > 0
      ) {
        const newDuration = unit.meta.stunDuration - 1;
        // console.log(`StatusEffects: unit ${unit.id} stunDuration ${unit.meta.stunDuration} -> ${newDuration}`);
        if (newDuration <= 0) {
          // console.log("  -> Clearing stun (duration reached 0)");
          const clearCommand = {
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                stunned: undefined,
                stunDuration: undefined,
              },
            },
          };
          // console.log("  -> Pushing clear command meta:", clearCommand.params.meta);
          this.commands.push(clearCommand);
        } else {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                stunned: true, // PRESERVE the stunned flag!
                stunDuration: newDuration,
              },
            },
          });
        }
      }

      if (unit.meta.statusEffects && unit.meta.statusEffects.length > 0) {
        this.updateStatusEffects(context, unit);
        this.applyStatusEffectMechanics(context, unit);
      } else if (
        unit.meta.chilled ||
        (unit.meta.stunned && !unit.meta.stunDuration)
      ) {
        // Only clean up old effects if there's no duration being tracked
        this.applyStatusEffectMechanics(context, unit);
      }
    }

    // console.log(`StatusEffects returning ${this.commands.length} commands`);
    return this.commands;
  }

  private applyChillFromTrigger(context: TickContext, unit: Unit): void {
    const trigger = unit.meta.chillTrigger;
    const centerPos = trigger.position || unit.pos;
    const radius = trigger.radius || 2;

    const affectedUnits = context.getAllUnits().filter((target) => {
      const distance = Math.sqrt(
        Math.pow(target.pos.x - centerPos.x, 2) +
          Math.pow(target.pos.y - centerPos.y, 2),
      );
      return distance <= radius;
    });

    affectedUnits.forEach((target) => {
      this.commands.push({
        type: "applyStatusEffect",
        params: {
          unitId: target.id,
          effect: {
            type: "chill",
            duration: 30, // 3.75 seconds at 8fps
            intensity: 0.5, // 50% movement speed reduction
            source: unit.id,
          },
        },
      });
    });

    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          chillTrigger: undefined,
        },
      },
    });
  }

  private updateStatusEffects(context: TickContext, unit: Unit): void {
    const statusEffects = unit.meta.statusEffects || [];
    const updatedEffects = statusEffects
      .map((effect) => ({
        ...effect,
        duration: effect.duration - 1,
      }))
      .filter((effect) => effect.duration > 0);

    this.commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          statusEffects: updatedEffects.length > 0 ? updatedEffects : undefined,
        },
      },
    });
  }

  private applyStatusEffectMechanics(context: TickContext, unit: Unit): void {
    const statusEffects = unit.meta.statusEffects || [];

    statusEffects.forEach((effect) => {
      switch (effect.type) {
        case "chill":
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                chilled: true,
                chillIntensity: effect.intensity,
              },
            },
          });
          break;
        case "stun":
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: { stunned: true },
            },
          });
          break;
        case "burn":
          if (context.getCurrentTick() % 8 === 0) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: unit.id,
                amount: effect.intensity,
                aspect: "heat",
                sourceId: effect.source || "burn",
              },
            });
          }
          break;
      }
    });

    if (
      statusEffects.length === 0 &&
      (unit.meta.chilled || unit.meta.stunned)
    ) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            chilled: undefined,
            chillIntensity: undefined,
            stunned: undefined,
          },
        },
      });
    }
  }
}
