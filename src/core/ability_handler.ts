import { Unit } from "../types/Unit";
import { Rule } from "../rules/rule";
import { Abilities } from "../rules/abilities";
import { TickContext } from "./tick_context";
import { QueuedCommand } from "./command_handler";
import { UnitProxyManager } from "../sim/unit_proxy";

/**
 * Handles ability forcing and execution
 * Extracted from Simulator to reduce complexity
 */
export class AbilityHandler {
  private forcedAbilitiesThisTick = new Set<string>();

  constructor(
    private proxyManager: UnitProxyManager,
    private rulebook: Rule[],
    private ticks: number
  ) {}

  isAbilityForced(unitId: string, abilityName: string): boolean {
    const key = `${unitId}:${abilityName}`;
    return this.forcedAbilitiesThisTick.has(key);
  }

  clearForcedAbilities(): void {
    this.forcedAbilitiesThisTick.clear();
  }

  updateTicks(ticks: number): void {
    this.ticks = ticks;
  }

  forceAbility(
    unitId: string,
    abilityName: string,
    units: readonly Unit[],
    context: TickContext,
    target?: any
  ): QueuedCommand[] {
    const key = `${unitId}:${abilityName}`;
    this.forcedAbilitiesThisTick.add(key);
    
    const unit = units.find((u) => u.id === unitId);
    if (
      !unit ||
      !Array.isArray(unit.abilities) ||
      !unit.abilities.includes(abilityName)
    )
      return [];

    const abilitiesRule = this.rulebook.find(
      (rule) => rule.constructor.name === "Abilities",
    );
    if (!abilitiesRule) {
      console.warn("Abilities rule not found in rulebook");
      return [];
    }

    const jsonAbility = Abilities.all[abilityName];
    if (!jsonAbility) {
      console.warn(`Ability ${abilityName} not found in JSON definitions`);
      return [];
    }

    const primaryTarget = target || unit;

    (abilitiesRule as any).commands = [];
    (abilitiesRule as any).cachedAllUnits = context.getAllUnits();

    for (const effect of jsonAbility.effects) {
      (abilitiesRule as Abilities).processEffectAsCommand(
        context,
        effect,
        unit,
        primaryTarget,
      );
    }

    const generatedCommands = (abilitiesRule as any).commands || [];

    if (this.proxyManager) {
      const currentTick = {
        ...unit.lastAbilityTick,
        [abilityName]: this.ticks,
      };
      this.proxyManager.setLastAbilityTick(unit.id, currentTick);
    }

    const metaCommand: QueuedCommand = {
      type: "meta",
      params: {
        unitId: unit.id,
        meta: {
          lastAbilityTick: {
            ...unit.lastAbilityTick,
            [abilityName]: this.ticks,
          },
        },
      },
    };

    return [...generatedCommands, metaCommand];
  }
}