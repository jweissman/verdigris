import DSL from "./dsl";
import { Rule } from "./rule";
import { AbilityEffect } from "../types/AbilityEffect";
import { Ability } from "../types/Ability";
import { Unit } from "../types/Unit";
import * as abilitiesJson from "../../data/abilities.json";
import type { TickContext } from "../core/tick_context";
import type { QueuedCommand } from "./command_handler";

export class Abilities extends Rule {
  // @ts-ignore
  static all: { [key: string]: Ability } = abilitiesJson as any;

  private commands: QueuedCommand[] = [];

  constructor() {
    super();
  }

  ability = (name: string): Ability | undefined => Abilities.all[name];

  execute(context: TickContext): QueuedCommand[] {
    this.commands = [];

    const currentTick = context.getCurrentTick();
    context.getAllUnits().forEach((unit) => {
      if (
        unit.meta?.burrowed &&
        unit.meta.burrowStartTick !== undefined &&
        unit.meta.burrowDuration !== undefined
      ) {
        const ticksBurrowed = currentTick - unit.meta.burrowStartTick;
        if (ticksBurrowed >= unit.meta.burrowDuration) {
          this.commands.push({
            type: "meta",
            params: {
              unitId: unit.id,
              meta: {
                burrowed: false,
                invisible: false,
                burrowStartTick: undefined,
                burrowDuration: undefined,
              },
            },
          });
        }
      }
    });

    context.getAllUnits().forEach((unit) => {
      if (!unit.abilities || !Array.isArray(unit.abilities)) {
        return;
      }

      for (const abilityName of unit.abilities) {
        const ability = this.ability(abilityName);
        if (!ability) {
          continue;
        }

        let lastTick = unit.lastAbilityTick
          ? unit.lastAbilityTick[abilityName]
          : undefined;
        let ready =
          lastTick === undefined || currentTick - lastTick >= ability.cooldown;

        if (!ready) {
          continue;
        }

        if (ability.maxUses) {
          const usesKey = `${abilityName}Uses`;
          const currentUses = unit.meta[usesKey] || 0;
          if (currentUses >= ability.maxUses) {
            continue; // Ability exhausted
          }
        }

        let shouldTrigger = true;
        if (ability.trigger) {
          try {
            shouldTrigger = DSL.evaluate(ability.trigger, unit, context);
          } catch (error) {
            console.error(
              `Error evaluating JSON ability trigger for ${abilityName}:`,
              error,
            );
            shouldTrigger = false;
          }
        }

        if (!shouldTrigger) {
          continue;
        }

        let target = unit; // Default to self
        if (ability.target && ability.target !== "self") {
          try {
            target = DSL.evaluate(ability.target, unit, context);
          } catch (error) {
            console.error(
              `Error evaluating JSON ability target for ${abilityName}:`,
              error,
            );
            continue;
          }

          if (target === null || target === undefined) {
            continue;
          }
        }

        for (const effect of ability.effects) {
          this.processEffectAsCommand(context, effect, unit, target);
        }

        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              lastAbilityTick: {
                ...unit.lastAbilityTick,
                [abilityName]: currentTick,
              },
            },
          },
        });
      }
    });

    return this.commands;
  }

  processEffectAsCommand(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    switch (effect.type) {
      case "damage":
        this.hurt(context, effect, caster, primaryTarget);
        break;
      case "heal":
        this.heal(context, effect, caster, primaryTarget);
        break;
      case "aoe":
        this.areaOfEffect(context, effect, caster, primaryTarget);
        break;
      case "projectile":
        this.project(context, effect, caster, primaryTarget);
        break;
      case "weather":
        this.changeWeather(context, effect, caster, primaryTarget);
        break;
      case "lightning":
        this.bolt(context, effect, caster, primaryTarget);
        break;
      case "jump":
        this.leap(context, effect, caster, primaryTarget);
        break;
      case "explode":
        this.explode(context, effect, caster);
        break;
      case "heat":
        this.adjustTemperature(context, effect, caster, primaryTarget);
        break;
      case "deploy":
        this.deploy(context, effect, caster, primaryTarget);
        break;
      case "grapple":
        this.grapply(context, effect, caster, primaryTarget);
        break;
      case "pin":
        this.pin(context, effect, caster, primaryTarget);
        break;
      case "airdrop":
        this.airdrop(context, effect, caster, primaryTarget);
        break;
      case "buff":
        this.buff(context, effect, caster, primaryTarget);
        break;
      case "summon":
        this.summon(context, effect, caster, primaryTarget);
        break;
      case "moisture":
        this.adjustHumidity(context, effect, caster, primaryTarget);
        break;
      case "toss":
        this.toss(context, effect, caster, primaryTarget);
        break;
      case "setOnFire":
        this.ignite(context, effect, caster, primaryTarget);
        break;
      case "particles":
        this.createParticles(context, effect, caster, primaryTarget);
        break;
      case "cone":
        this.coneOfEffect(context, effect, caster, primaryTarget);
        break;
      case "multiple_projectiles":
        this.multiproject(context, effect, caster, primaryTarget);
        break;
      case "line_aoe":
        this.lineOfEffect(context, effect, caster, primaryTarget);
        break;
      case "area_buff":
        this.domainBuff(context, effect, caster, primaryTarget);
        break;
      case "debuff":
        this.debuff(context, effect, caster, primaryTarget);
        break;
      case "cleanse":
        this.cleanse(context, effect, caster, primaryTarget);
        break;
      case "area_particles":
        this.createAreaParticles(context, effect, caster, primaryTarget);
        break;
      case "reveal":
        this.reveal(context, effect, caster, primaryTarget);
        break;
      case "burrow":
        this.burrow(context, effect, caster, primaryTarget);
        break;
      case "tame":
        this.tame(context, effect, caster, primaryTarget);
        break;
      case "calm":
        this.calm(context, effect, caster, primaryTarget);
        break;
      case "entangle":
        this.tangle(context, effect, caster, primaryTarget);
        break;
      case "terrain":
        this.modifyTerrain(context, effect, caster, primaryTarget);
        break;
      default:
        console.warn(`Abilities: Unknown effect type ${effect.type}`);
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }

  private resolveTarget(
    context: TickContext,
    targetExpression: any,
    caster: any,
    primaryTarget: any,
  ): any {
    if (!targetExpression) return primaryTarget;
    if (targetExpression === "self") return caster;
    if (targetExpression === "target") return primaryTarget;
    if (targetExpression === "self.pos") return caster.pos;
    if (targetExpression === "target.pos")
      return primaryTarget.pos || primaryTarget;

    if (typeof targetExpression === "object" && targetExpression !== null) {
      return targetExpression;
    }

    if (typeof targetExpression === "string") {
      try {
        return DSL.evaluate(targetExpression, caster, context);
      } catch (error) {
        console.warn(`Failed to resolve target '${targetExpression}':`, error);
        return null;
      }
    }

    return targetExpression;
  }

  private resolveValue(
    context: TickContext,
    value: any,
    caster: any,
    target: any,
  ): any {
    if (typeof value === "string") {
      try {
        return DSL.evaluate(value, caster, context, target);
      } catch (error) {
        console.warn(`Failed to resolve DSL value '${value}':`, error);
        return value;
      }
    }

    if (typeof value !== "object") return value;

    if (value.$random) {
      if (Array.isArray(value.$random)) {
        return value.$random[
          Math.floor(context.getRandom() * value.$random.length)
        ];
      } else if (
        value.$random.length === 2 &&
        typeof value.$random[0] === "number"
      ) {
        const [min, max] = value.$random;
        return Math.floor(min + context.getRandom() * (max - min + 1));
      }
    }

    if (value.$conditional) {
      const condition = value.$conditional.if;
      try {
        const conditionStr = condition.replace(/target\./g, "");
        const targetForEval = target || caster;
        const hasTag = (tag: string) =>
          targetForEval.tags?.includes(tag) || false;
        const isUndead = hasTag("undead");
        const isSpectral = hasTag("spectral");

        if (condition.includes("undead") && condition.includes("spectral")) {
          const conditionResult = isUndead || isSpectral;
          return conditionResult
            ? value.$conditional.then
            : value.$conditional.else;
        }

        const conditionResult = DSL.evaluate(condition, caster, context);
        return conditionResult
          ? value.$conditional.then
          : value.$conditional.else;
      } catch (error) {
        console.warn(`Failed to evaluate conditional: ${condition}`, error);
        return value.$conditional.else || 0;
      }
    }

    return value;
  }

  private hurt(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target,
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || "physical";

    this.commands.push({
      type: "damage",
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect,
      },
      unitId: caster.id,
    });
  }

  private heal(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target,
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    const amount = this.resolveValue(context, effect.amount, caster, target);
    const aspect = effect.aspect || "healing";

    this.commands.push({
      type: "heal",
      params: {
        targetId: target.id,
        amount: amount,
        aspect: aspect,
      },
      unitId: caster.id,
    });
  }

  private areaOfEffect(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target,
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const amount = this.resolveValue(context, effect.amount, caster, target);
    const radius = this.resolveValue(context, effect.radius, caster, target);
    const aspect = effect.aspect || "physical";

    this.commands.push({
      type: "aoe",
      params: {
        x: pos.x,
        y: pos.y,
        radius: radius,
        damage: amount,
        type: aspect,
        stunDuration: this.resolveValue(
          context,
          (effect as any).stunDuration,
          caster,
          target,
        ),
      },
      unitId: caster.id,
    });
  }

  private project(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const startPos = this.resolveTarget(
      context,
      effect.pos || "self.pos",
      caster,
      primaryTarget,
    );
    if (!startPos) return;

    const projectileType = effect.projectileType || effect.id || "bullet";
    const damage =
      this.resolveValue(context, effect.damage, caster, primaryTarget) || 0;
    const radius =
      this.resolveValue(context, effect.radius, caster, primaryTarget) || 1;

    const params: any = {
      x: startPos.x,
      y: startPos.y,
      projectileType: projectileType,
      damage: damage,
      radius: radius,
      team: caster.team,
      z: this.resolveValue(context, (effect as any).z, caster, primaryTarget),
    };

    if (effect.target) {
      const target = this.resolveTarget(
        context,
        effect.target,
        caster,
        primaryTarget,
      );
      if (target) {
        const targetPos = target.pos || target;
        if (
          targetPos &&
          typeof targetPos.x === "number" &&
          typeof targetPos.y === "number"
        ) {
          params.targetX = targetPos.x;
          params.targetY = targetPos.y;
        }
      }
    } else if (primaryTarget && primaryTarget.pos) {
      params.targetX = primaryTarget.pos.x;
      params.targetY = primaryTarget.pos.y;
    }

    this.commands.push({
      type: "projectile",
      params: params,
      unitId: caster.id,
    });
  }

  private changeWeather(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const weatherType = effect.weatherType || "rain";
    const duration = effect.duration || 60;
    const intensity = effect.intensity || 0.5;

    this.commands.push({
      type: "weather",
      params: {
        weatherType: weatherType,
        duration: duration,
        intensity: intensity,
      },
      unitId: caster.id,
    });
  }

  private bolt(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );

    const params: any = {};
    if (target) {
      const pos = target.pos || target;
      params.x = pos.x;
      params.y = pos.y;
    }

    this.commands.push({
      type: "lightning",
      params: params,
      unitId: caster.id,
    });
  }

  private explode(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
  ): void {
    const radius = effect.meta?.radius || 2;
    const damage = effect.meta?.damage || caster.hp * 2; // Damage based on remaining HP

    this.commands.push({
      type: "aoe",
      params: {
        x: caster.pos.x,
        y: caster.pos.y,
        radius: radius,
        damage: damage,
        type: "explosive",
      },
      unitId: caster.id,
    });

    this.commands.push({
      type: "damage",
      params: {
        targetId: caster.id,
        amount: caster.hp + 100, // Ensure death
        damageType: "explosive",
      },
    });
  }

  private leap(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const height =
      this.resolveValue(context, effect.height, caster, target) || 5;
    const damage =
      this.resolveValue(context, effect.damage, caster, target) || 5;
    const radius =
      this.resolveValue(context, effect.radius, caster, target) || 3;

    this.commands.push({
      type: "jump",
      params: {
        targetX: pos.x,
        targetY: pos.y,
        height: height,
        damage: damage,
        radius: radius,
      },
      unitId: caster.id,
    });
  }

  private adjustTemperature(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const amount =
      this.resolveValue(context, effect.amount, caster, target) || 5;
    const radius =
      this.resolveValue(context, effect.radius, caster, target) || 1;

    this.commands.push({
      type: "temperature",
      params: {
        x: pos.x,
        y: pos.y,
        amount: amount,
        radius: radius,
      },
      unitId: caster.id,
    });
  }

  private deploy(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const constructType =
      this.resolveValue(
        context,
        (effect as any).constructType,
        caster,
        primaryTarget,
      ) || "clanker";

    this.commands.push({
      type: "deploy",
      params: {
        unitType: constructType,
      },
      unitId: caster.id,
    });

    if (!caster.meta) caster.meta = {};
    if (!caster.meta.deployBotUses) caster.meta.deployBotUses = 0;
    caster.meta.deployBotUses++;
  }

  private grapply(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    this.commands.push({
      type: "grapple",
      params: {
        x: pos.x,
        y: pos.y,
      },
      unitId: caster.id,
    });
  }

  private pin(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;

    this.commands.push({
      type: "pin",
      params: {
        x: pos.x,
        y: pos.y,
      },
      unitId: caster.id,
    });
  }

  private airdrop(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!target) return;

    let pos = target.pos || target;

    if (caster.sprite === "mechatronist") {
      if (pos.x !== undefined && pos.y !== undefined && !target.id) {
        pos = {
          x: (caster.pos.x + pos.x) / 2,
          y: (caster.pos.y + pos.y) / 2,
        };
      } else if (target.id && target.team !== caster.team) {
        pos = {
          x: (caster.pos.x + target.pos.x) / 2,
          y: (caster.pos.y + target.pos.y) / 2,
        };
      }
    }

    const unitType = (effect as any).unit || "mechatron";

    this.commands.push({
      type: "airdrop",
      params: {
        unitType: unitType,
        x: pos.x,
        y: pos.y,
      },
      unitId: caster.id,
    });
  }

  private buff(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    if (!target.meta) target.meta = {};

    if (effect.buff) {
      for (const [stat, value] of Object.entries(effect.buff)) {
        if (typeof value === "string" && value.startsWith("+")) {
          const increase = parseInt(value.substring(1));
          if (stat === "maxHp") {
            const oldMaxHp = target.maxHp || 0;

            this.commands.push({
              type: "heal",
              params: {
                targetId: target.id,
                amount: 0, // Don't heal here
                newMaxHp: oldMaxHp + increase,
              },
            });

            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                meta: {
                  maxHpBuffed: true,
                  maxHpBonus: increase,
                },
              },
            });
          } else if (stat === "armor") {
            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                meta: {
                  ...target.meta,
                  armor: (target.meta.armor || 0) + increase,
                },
              },
            });
          } else if (stat === "dmg") {
            this.commands.push({
              type: "meta",
              params: {
                unitId: target.id,
                dmg: (target.dmg || 0) + increase,
              },
            });
          }
        } else {
          this.commands.push({
            type: "meta",
            params: {
              unitId: target.id,
              meta: {
                ...target.meta,
                [stat]: value,
              },
            },
          });
        }
      }
    }

    if ((effect as any).hpIncrease) {
      const increase = this.resolveValue(
        context,
        (effect as any).hpIncrease,
        caster,
        target,
      );
      target.hp = Math.min(target.maxHp, target.hp + increase);
    }

    if (effect.amount) {
      const amount = this.resolveValue(context, effect.amount, caster, target);

      target.hp = Math.min(target.maxHp, target.hp + amount);
    }
  }

  private summon(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const unitType =
      this.resolveValue(context, effect.unit, caster, primaryTarget) ||
      "squirrel";
    const pos = caster.pos;

    const Encyclopaedia = require("../dmg/encyclopaedia").default;
    const summonedUnit = {
      ...Encyclopaedia.unit(unitType),
      id: `${unitType}_${caster.id}_${context.getCurrentTick()}`,
      pos: {
        x: pos.x + (context.getRandom() - 0.5) * 2,
        y: pos.y + (context.getRandom() - 0.5) * 2,
      },
      team: caster.team,
      meta: {
        summoned: true,
        summonedBy: caster.id,
        summonTick: context.getCurrentTick(),
      },
    };

    this.commands.push({
      type: "spawn",
      params: { unit: summonedUnit },
    });
  }

  private adjustHumidity(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const amount =
      this.resolveValue(context, effect.amount, caster, target) || 1.0;
    const radius =
      this.resolveValue(context, effect.radius, caster, target) || 5;

    context.queueEvent({
      kind: "moisture",
      source: caster.id,
      target: pos,
      meta: { amount, radius },
    });
  }

  private toss(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    const distance =
      this.resolveValue(context, (effect as any).distance, caster, target) || 5;

    this.commands.push({
      type: "toss",
      params: {
        targetId: target.id,
        distance: distance,
      },
      unitId: caster.id,
    });
  }

  private ignite(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    this.commands.push({
      type: "meta",
      params: {
        unitId: target.id,
        meta: {
          onFire: true,
          onFireDuration: 30,
        },
      },
    });
  }

  private modifyTerrain(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const pos = this.resolveTarget(
      context,
      effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!pos) return;

    const terrainType = (effect as any).terrainType;
    const radius = (effect as any).radius || 1;
    const duration = effect.duration || 200;

    if (terrainType === "trench") {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = Math.floor(pos.x + dx);
          const y = Math.floor(pos.y + dy);

          context.queueEvent({
            kind: "terrain",
            source: caster.id,
            target: { x, y }, // Position goes in target, not meta
            meta: {
              terrainType: "trench",
              duration,
              defenseBonus: 0.5, // 50% damage reduction
              movementPenalty: 0.3, // 30% slower movement
            },
          });

          for (let i = 0; i < 3; i++) {
            this.commands.push({
              type: "particle",
              params: {
                particle: {
                  pos: {
                    x: (x + context.getRandom()) * 8 + 4,
                    y: (y + context.getRandom()) * 8 + 4,
                  },
                  vel: {
                    x: (context.getRandom() - 0.5) * 0.2,
                    y: -context.getRandom() * 0.3,
                  },
                  radius: 0.5 + context.getRandom() * 0.5,
                  lifetime: 20 + context.getRandom() * 20,
                  color: "#8B4513", // Brown dust
                  type: "debris", // Use debris for dust/dirt particles
                },
              },
            });
          }
        }
      }
    }
  }

  private tangle(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const duration =
      this.resolveValue(context, effect.duration, caster, target) || 30;
    const radius =
      this.resolveValue(context, effect.radius, caster, target) || 3;

    if (target.id) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: target.id,
          meta: {
            pinned: true,
            pinDuration: duration,
            entangled: true,
          },
        },
      });

      const particles = [];
      for (let i = 0; i < 8; i++) {
        particles.push({
          id: `entangle_${caster.id}_${context.getCurrentTick()}_${i}`,
          pos: {
            x: target.pos.x + (context.getRandom() - 0.5) * radius,
            y: target.pos.y + (context.getRandom() - 0.5) * radius,
          },
          vel: { x: 0, y: 0 },
          lifetime: duration,
          color: "#228B22", // Forest green
          type: "entangle",
          radius: 0.5,
        });
      }

      for (const particle of particles) {
        this.commands.push({
          type: "particle",
          params: { particle },
        });
      }
    }
  }

  private coneOfEffect(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const direction = caster.facing || { x: 1, y: 0 };
    const range = effect.range || 4;
    const width = effect.width || 3;

    if (effect.effects) {
      for (const nestedEffect of effect.effects) {
        const unitsInCone = context.getAllUnits().filter((u) => {
          if (u.id === caster.id || u.team === caster.team) return false;

          const dist = Math.sqrt(
            Math.pow(u.pos.x - caster.pos.x, 2) +
              Math.pow(u.pos.y - caster.pos.y, 2),
          );
          return dist <= (typeof range === "number" ? range : Number(range));
        });

        for (const unit of unitsInCone) {
          this.processEffectAsCommand(context, nestedEffect, caster, unit);
        }
      }
    }
  }

  private multiproject(
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const count = this.resolveValue(effect.count, caster, primaryTarget) || 1;
    const stagger =
      this.resolveValue((effect as any).stagger, caster, primaryTarget) || 0;

    for (let i = 0; i < count; i++) {
      const projectileEffect = {
        type: "projectile" as const,
        projectileType: (effect as any).projectileType || "bullet",
        pos: (effect as any).pos || "self.pos",
        target: effect.target,
        damage: (effect as any).damage || effect.amount,
        radius: effect.radius,
        vel: (effect as any).vel,
        z: (effect as any).z,
        duration: (effect as any).duration,
        spread: (effect as any).spread,
        origin: (effect as any).origin,
      };

      if (stagger > 0 && i > 0) {
      }

      this.project(projectileEffect, caster, primaryTarget);
    }
  }

  private lineOfEffect(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const start = this.resolveTarget(
      context,
      (effect as any).start || "self.pos",
      caster,
      primaryTarget,
    );
    const end = this.resolveTarget(
      context,
      (effect as any).end || "target",
      caster,
      primaryTarget,
    );
    if (!start || !end) return;

    const amount = this.resolveValue(
      context,
      effect.amount,
      caster,
      primaryTarget,
    );
    const aspect = effect.aspect || "physical";

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;

      this.commands.push({
        type: "aoe",
        params: {
          x: x,
          y: y,
          radius: 1,
          damage: amount,
          type: aspect,
        },
        unitId: caster.id,
      });
    }
  }

  private domainBuff(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const radius = this.resolveValue(effect.radius, caster, target) || 3;

    const unitsInArea = context.getAllUnits().filter((u) => {
      const dist = Math.sqrt(
        Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2),
      );
      if (dist > radius) return false;

      if (effect.condition && typeof effect.condition === "string") {
        try {
          if (effect.condition.includes("mechanical")) {
            return u.tags?.includes("mechanical");
          }
          if (effect.condition.includes("construct")) {
            return u.tags?.includes("construct");
          }

          const safeUnit = { ...u, tags: u.tags || [] };
          const context = {
            ...safeUnit,
            target: safeUnit, // Make target reference the same unit with safe tags
            self: safeUnit,
          };
          return DSL.evaluate(effect.condition, context, this.sim);
        } catch (error) {
          console.warn(
            `Failed to evaluate condition '${effect.condition}':`,
            error,
          );
          return false;
        }
      }

      return true;
    });

    for (const unit of unitsInArea) {
      if (effect.buff) {
        if (!unit.meta) unit.meta = {};
        Object.assign(unit.meta, effect.buff);

        if (effect.buff.resetCooldowns) {
          if (unit.lastAbilityTick) {
            for (const abilityName in unit.lastAbilityTick) {
              unit.lastAbilityTick[abilityName] = 0;
            }
          }
        }
      }
    }
  }

  private debuff(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    if (effect.debuff) {
      if (!target.meta) target.meta = {};
      Object.assign(target.meta, effect.debuff);
    }
  }

  private cleanse(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    if (effect.effectsToRemove && target.meta) {
      for (const effectName of effect.effectsToRemove) {
        delete target.meta[effectName];
      }
    }
  }

  private reveal(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const radius = effect.radius || 6;

    const unitsInArea = context.getAllUnits().filter((u) => {
      const dist = Math.sqrt(
        Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2),
      );
      return dist <= (typeof radius === "number" ? radius : Number(radius));
    });

    for (const unit of unitsInArea) {
      if (unit.meta.hidden || unit.meta.invisible) {
        this.commands.push({
          type: "meta",
          params: {
            unitId: unit.id,
            meta: {
              hidden: false,
              invisible: false,
              revealed: true,
            },
          },
        });
      }
    }
  }

  private burrow(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "self",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const duration = effect.duration || 15;

    if (!target.meta) target.meta = {};
    target.meta.burrowed = true;
    target.meta.invisible = true;
    target.meta.burrowDuration = duration;
    target.meta.burrowStartTick = context.getCurrentTick();
  }

  private tame(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "target",
      caster,
      primaryTarget,
    );
    if (!target || !target.id) return;

    const actualTarget = context.findUnitById(target.id);
    if (!actualTarget) return;

    if (caster.abilities?.includes("tameMegabeast") && actualTarget.mass < 10) {
      console.warn(
        `${caster.id} cannot tame ${actualTarget.id} - target mass ${actualTarget.mass} is too low (requires >= 10)`,
      );
      return;
    }

    this.commands.push({
      type: "meta",
      params: {
        unitId: actualTarget.id,
        meta: {
          originalTeam: actualTarget.meta.originalTeam || actualTarget.team,
          tamed: true,
          tamedBy: caster.id,
        },
      },
    });

    this.commands.push({
      type: "changeTeam",
      unitId: actualTarget.id,
      params: {
        team: caster.team,
      },
    });

    for (let i = 0; i < 5; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: (actualTarget.pos.x + (context.getRandom() - 0.5) * 2) * 8 + 4,
              y: (actualTarget.pos.y + (context.getRandom() - 0.5) * 2) * 8 + 4,
            },
            vel: { x: 0, y: -0.1 },
            radius: 0.3,
            lifetime: 20,
            color: "#90EE90", // Light green
            type: "tame",
          },
        },
      });
    }
  }

  private calm(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const radius =
      this.resolveValue(context, effect.radius, caster, primaryTarget) || 5;

    const beastSprites = [
      "bear",
      "owl",
      "wolf",
      "fox",
      "deer",
      "rabbit",
      "squirrel",
      "bird",
    ];
    const unitsInArea = context.getAllUnits().filter((u) => {
      const dist = Math.sqrt(
        Math.pow(u.pos.x - pos.x, 2) + Math.pow(u.pos.y - pos.y, 2),
      );
      return (
        dist <= radius &&
        (u.tags?.includes("animal") ||
          u.tags?.includes("beast") ||
          beastSprites.includes(u.sprite))
      );
    });

    for (const unit of unitsInArea) {
      this.commands.push({
        type: "meta",
        params: {
          unitId: unit.id,
          meta: {
            calmed: true,
            aggressive: false,
          },
        },
      });

      this.commands.push({
        type: "halt",
        params: { unitId: unit.id },
      });

      const particleId = `calm_${unit.id}`;
      if (
        !unit.meta.calmed &&
        !context.getParticles().some((p) => p.id === particleId)
      ) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: { x: unit.pos.x * 8 + 4, y: (unit.pos.y - 0.5) * 8 + 4 },
              vel: { x: 0, y: -0.05 },
              radius: 1,
              lifetime: 30,
              color: "#ADD8E6", // Light blue
              type: "calm",
            },
          },
        });
      }
    }
  }

  private createAreaParticles(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const center = this.resolveTarget(
      context,
      effect.center || "self.pos",
      caster,
      primaryTarget,
    );
    if (!center) return;

    const centerPos = center.pos || center;
    const size = effect.size || "3x3";
    const [width, height] = size.split("x").map((s) => parseInt(s));
    const particleType = effect.particleType || "energy";
    const color = effect.color || "#00CCFF";
    const lifetime = effect.lifetime || 80;

    for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
      for (
        let dy = -Math.floor(height / 2);
        dy <= Math.floor(height / 2);
        dy++
      ) {
        this.commands.push({
          type: "particle",
          params: {
            particle: {
              pos: {
                x: (centerPos.x + dx) * 8 + 4,
                y: (centerPos.y + dy) * 8 + 4,
              },
              vel: { x: 0, y: -0.1 },
              radius: 2,
              color: color,
              lifetime: lifetime,
              type: particleType,
            },
          },
        });
      }
    }
  }

  private createParticles(
    context: TickContext,
    effect: AbilityEffect,
    caster: any,
    primaryTarget: any,
  ): void {
    const target = this.resolveTarget(
      context,
      (effect as any).pos || effect.target || "self.pos",
      caster,
      primaryTarget,
    );
    if (!target) return;

    const pos = target.pos || target;
    const color = (effect as any).color || "#FFFFFF";
    const lifetime =
      this.resolveValue(context, (effect as any).lifetime, caster, target) ||
      20;
    const count =
      this.resolveValue(context, (effect as any).count, caster, target) || 5;

    for (let i = 0; i < count; i++) {
      this.commands.push({
        type: "particle",
        params: {
          particle: {
            pos: {
              x: (pos.x + (context.getRandom() - 0.5) * 2) * 8 + 4,
              y: (pos.y + (context.getRandom() - 0.5) * 2) * 8 + 4,
            },
            vel: {
              x: (context.getRandom() - 0.5) * 0.2,
              y: (context.getRandom() - 0.5) * 0.2,
            },
            radius: 1,
            lifetime: lifetime + context.getRandom() * 10,
            color: color,
            type: (effect as any).particleType || "generic",
          },
        },
      });
    }
  }
}
