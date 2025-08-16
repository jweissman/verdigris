import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";
import type { QueuedCommand } from "./command_handler";

export class MeleeCombat extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();

  execute(context: TickContext): QueuedCommand[] {
    const commands: QueuedCommand[] = [];
    const currentTick = context.getCurrentTick();

    for (const unit of context.getAllUnits()) {
      if (unit.state === "attack" && unit.meta?.lastAttacked) {
        const ticksSinceAttack = currentTick - unit.meta.lastAttacked;
        if (ticksSinceAttack > 2) {
          commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              state: "idle",
            },
          });
        }
      }
    }

    this.engagements.clear();
    this.performMeleeCombat(context, commands);

    return commands;
  }

  private performMeleeCombat(
    context: TickContext,
    commands: QueuedCommand[],
  ): void {
    const meleeRange = 1.5;

    const allUnits = context.getAllUnits();
    for (const attacker of allUnits) {
      if (this.engagements.has(attacker.id)) continue;

      if (attacker.hp <= 0) continue;
      if (attacker.meta?.jumping) continue;
      if (attacker.tags?.includes("noncombatant")) continue;

      const nearbyUnits = context.findUnitsInRadius(attacker.pos, meleeRange);

      for (const target of nearbyUnits) {
        if (target.id === attacker.id) continue;

        if (target.hp <= 0) continue;
        if (target.meta?.jumping) continue;
        if (target.tags?.includes("noncombatant")) continue;

        if (attacker.team === target.team) continue;

        this.processHit(context, attacker, target, commands);
        break; // Only attack one target per attacker
      }
    }
  }

  private processHit(
    context: TickContext,
    attacker: Unit,
    target: Unit,
    commands: QueuedCommand[],
  ): void {
    if (attacker.hp <= 0 || target.hp <= 0) return;

    this.engagements.set(attacker.id, target.id);
    this.lastAttacks.set(attacker.id, context.getCurrentTick());

    commands.push({
      type: "halt",
      params: { unitId: attacker.id },
    });

    commands.push({
      type: "meta",
      params: {
        unitId: attacker.id,
        meta: { lastAttacked: context.getCurrentTick() },
        state: "attack",
      },
    });

    commands.push({
      type: "damage",
      params: {
        targetId: target.id,
        amount: attacker.dmg || 1,
        aspect: "physical",
        sourceId: attacker.id,
      },
    });
  }
}
