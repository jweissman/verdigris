import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "../core/command_handler";
import { Ability } from "../types/Ability";
import * as abilitiesJson from "../../data/abilities.json";
import { dslCompiler } from "../dmg/dsl_compiler";

/**
 * Optimized Abilities rule that uses arrays directly for hot path
 * Per architecture critique: "Abilities and SegmentedCreatures are the slowest rules"
 * This implementation bypasses proxy creation entirely
 */
export class AbilitiesOptimized extends Rule {
  private static abilityCache = new Map<string, Ability | undefined>();
  private static precompiledAbilities = new Map<
    string,
    {
      trigger?: Function;
      target?: Function;
      ability: Ability;
    }
  >();

  private commands: QueuedCommand[] = [];

  constructor() {
    super();

    if (AbilitiesOptimized.precompiledAbilities.size === 0) {
      for (const name in abilitiesJson) {
        const ability = (abilitiesJson as any)[name];
        AbilitiesOptimized.abilityCache.set(name, ability);

        const compiled: any = { ability };

        if (ability.trigger) {
          try {
            compiled.trigger = dslCompiler.compile(ability.trigger);
          } catch (err) {
            console.error(`Failed to compile trigger for ${name}:`, err);
          }
        }

        if (ability.target) {
          try {
            compiled.target = dslCompiler.compile(ability.target);
          } catch (err) {
            console.error(`Failed to compile target for ${name}:`, err);
          }
        }

        AbilitiesOptimized.precompiledAbilities.set(name, compiled);
      }
    }
  }

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];
    const currentTick = context.getCurrentTick();

    const arrays = context.getArrays();
    if (!arrays) {
      return []; // No arrays available, skip
    }

    const { posX, posY, team, state, hp, unitIds, activeIndices } = arrays;

    for (const idx of activeIndices) {
      if (state[idx] === 5 || hp[idx] <= 0) continue; // 5 = dead state

      const unitId = unitIds[idx];
      const coldData = context.getUnitColdData(unitId);
      if (!coldData) continue;

      const abilities = coldData.abilities;
      if (!abilities || abilities.length === 0) continue;

      const hasNonCombatAbility = abilities.some(
        (a: string) => a !== "melee" && a !== "ranged",
      );
      if (!hasNonCombatAbility && !coldData.meta?.burrowed) continue;

      for (const abilityName of abilities) {
        if (abilityName === "melee" || abilityName === "ranged") continue;

        const precompiled =
          AbilitiesOptimized.precompiledAbilities.get(abilityName);
        if (!precompiled) continue;

        const ability = precompiled.ability;

        const lastTick = coldData.lastAbilityTick?.[abilityName];
        if (
          lastTick !== undefined &&
          currentTick - lastTick < ability.cooldown
        ) {
          continue;
        }

        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = coldData.meta?.[usesKey] || 0;
          if (currentUses >= ability.maxUses) continue;
        }

        if (precompiled.trigger) {
          try {
            const unitData = {
              id: unitId,
              pos: { x: posX[idx], y: posY[idx] },
              hp: hp[idx],
              team:
                team[idx] === 1
                  ? "friendly"
                  : team[idx] === 2
                    ? "hostile"
                    : "neutral",
              state: ["idle", "walk", "attack", "dead"][state[idx]] || "idle",
              ...coldData,
            };

            const shouldTrigger = precompiled.trigger(unitData, context);
            if (!shouldTrigger) continue;
          } catch (err) {
            continue;
          }
        }

        let targetIdx = idx; // Default to self
        if (ability.target && ability.target !== "self") {
          if (ability.target === "closest.enemy()") {
            targetIdx = this.findClosestEnemyIndex(idx, arrays);
            if (targetIdx === -1) continue;
          }
        }

        this.queueAbilityEffects(ability, idx, targetIdx, arrays, unitId);

        this.commands.push({
          type: "meta",
          params: {
            unitId: unitId,
            meta: {
              lastAbilityTick: {
                ...(coldData.lastAbilityTick || {}),
                [abilityName]: currentTick,
              },
            },
          },
        });
      }
    }

    return this.commands;
  }

  private findClosestEnemyIndex(unitIdx: number, arrays: any): number {
    const { posX, posY, team, state, hp, activeIndices } = arrays;
    const unitTeam = team[unitIdx];
    const unitX = posX[unitIdx];
    const unitY = posY[unitIdx];

    let closestIdx = -1;
    let minDistSq = Infinity;

    for (const idx of activeIndices) {
      if (idx === unitIdx) continue;
      if (state[idx] === 5 || hp[idx] <= 0) continue;
      if (team[idx] === unitTeam) continue;

      const dx = posX[idx] - unitX;
      const dy = posY[idx] - unitY;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq) {
        minDistSq = distSq;
        closestIdx = idx;
      }
    }

    return closestIdx;
  }

  private queueAbilityEffects(
    ability: Ability,
    casterIdx: number,
    targetIdx: number,
    arrays: any,
    casterId: string,
  ): void {
    const { posX, posY, unitIds } = arrays;

    for (const effect of ability.effects) {
      switch (effect.type) {
        case "damage":
          if (targetIdx !== -1) {
            this.commands.push({
              type: "damage",
              params: {
                targetId: unitIds[targetIdx],
                amount: effect.amount || 0,
                sourceId: casterId,
              },
            });
          }
          break;

        case "heal":
          this.commands.push({
            type: "heal",
            params: {
              targetId: unitIds[targetIdx],
              amount: effect.amount || 0,
              sourceId: casterId,
            },
          });
          break;

        case "projectile":
          if (targetIdx !== -1) {
            const dx = posX[targetIdx] - posX[casterIdx];
            const dy = posY[targetIdx] - posY[casterIdx];
            const norm = Math.sqrt(dx * dx + dy * dy);

            this.commands.push({
              type: "projectile",
              params: {
                x: posX[casterIdx],
                y: posY[casterIdx],
                vx: (dx / norm) * 2,
                vy: (dy / norm) * 2,
                projectileType: effect.projectileType || "bullet",
                damage: effect.damage || 0,
                radius: effect.radius || 1,
              },
            });
          }
          break;

        default:
          this.commands.push({
            type: "ability_effect",
            params: {
              effect: effect,
              casterId: casterId,
              targetId: targetIdx !== -1 ? unitIds[targetIdx] : null,
              casterPos: { x: posX[casterIdx], y: posY[casterIdx] },
              targetPos:
                targetIdx !== -1
                  ? { x: posX[targetIdx], y: posY[targetIdx] }
                  : null,
            },
          });
      }
    }
  }
}
