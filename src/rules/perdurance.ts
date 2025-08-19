import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";

export class Perdurance extends Rule {
  constructor() {
    super();
  }
  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];

    for (const unit of context.getAllUnits()) {
      if (unit.meta?.pendingDamage) {
        this.processPendingDamage(context, unit, commands);
      }
    }

    return commands;
  }

  private processPendingDamage(
    context: TickContext,
    unit: Unit,
    commands: QueuedCommand[],
  ): void {
    const damage = unit.meta.pendingDamage;
    if (!damage) return;

    const damageAmount = damage.amount || 1;
    const damageAspect = damage.aspect || "physical";
    const source = damage.source || "unknown";

    if (this.shouldBlockDamage(context, unit, damageAspect)) {
      commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            pendingDamage: undefined,
          },
        },
      });
      return;
    }

    const modifiedAmount = this.modifyDamageAmount(
      context,
      unit,
      damageAmount,
      damageAspect,
    );

    // NOTE: This method is unused - perdurance is handled in damage command

    commands.push({
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          pendingDamage: undefined,
        },
      },
    });
  }

  private modifyDamageAmount(
    context: TickContext,
    target: Unit,
    amount: number,
    aspect: string,
  ): number {
    const perdurance = target.meta.perdurance;
    let modifiedAmount = amount;

    if (perdurance) {
      switch (perdurance) {
        case "sturdiness":
          if (modifiedAmount > 1) {
            modifiedAmount = 1;
          }
          break;

        case "swarm":
          // NOTE: Swarm units should attack with population damage so we do actually need to track it here?

          break;
      }
    }

    if (target.meta.brittle) {
      modifiedAmount *= 2;
    }

    return modifiedAmount;
  }

  private shouldBlockDamage(
    context: TickContext,
    unit: Unit,
    damageAspect?: string,
  ): boolean {
    const perdurance = unit.meta.perdurance;
    if (!perdurance) return false; // No special resistance

    switch (perdurance) {
      case "spectral":
        return !["radiant", "force", "heat", "shock"].includes(
          damageAspect || "physical",
        );

      case "undead":
        if (damageAspect === "radiant") return false; // Allow radiant damage
        if (damageAspect === "physical" || !damageAspect) return true; // Block physical
        return false; // Allow other magical damage

      case "fiendish":
        if (damageAspect === "radiant") return false; // Allow radiant damage
        if (damageAspect === "physical" || !damageAspect) {
          return context.getRandom() < 0.5;
        }
        return false; // Allow other damage

      case "sturdiness":
        return false; // Allow damage but we'll modify it below

      case "swarm":
        return false; // Allow damage but handle it differently

      default:
        return false; // Unknown perdurance type, no resistance
    }
  }
}
