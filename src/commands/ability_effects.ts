import { Command } from "../rules/command";
import type { AbilityEffect } from "../types/AbilityEffect";

/**
 * Efficient command to process ability effects
 * Handles both unit and position targets
 */
export class AbilityEffectsCommand extends Command {
  execute(
    unitId: string | null,
    params: { effects: AbilityEffect[]; casterId: string; target: any },
  ): void {
    const caster = this.sim.units.find((u) => u.id === params.casterId);
    if (!caster) return;

    const target = params.target;
    const targetUnit = target?.id
      ? this.sim.units.find((u) => u.id === target.id)
      : target;

    for (const effect of params.effects) {
      this.queueEffect(effect, caster, targetUnit || target);
    }
  }

  private queueEffect(effect: AbilityEffect, caster: any, target: any): void {
    const targetId = target?.id;
    const targetPos = target?.pos || target;

    switch (effect.type) {
      case "damage":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "damage",
            params: {
              targetId,
              amount: effect.amount || 0,
              sourceId: caster.id,
            },
          });
        }
        break;

      case "heal":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "heal",
            params: {
              targetId,
              amount: effect.amount || 0,
              sourceId: caster.id,
            },
          });
        }
        break;

      case "projectile":
        this.sim.queuedCommands.push({
          type: "projectile",
          params: {
            origin: caster.pos,
            destination: targetPos,
            speed: effect.speed || 1,
            damage: effect.damage || 0,
            casterId: caster.id,
            targetId: targetId,
            effect: effect.effect,
            style: effect.style || "bullet",
          },
        });
        break;

      case "aoe":
        const center =
          (effect as any).center === "target" ? targetPos : caster.pos;
        this.sim.queuedCommands.push({
          type: "aoe",
          params: {
            center,
            radius: effect.radius || 5,
            damage: effect.damage || 0,
            casterId: caster.id,
            effect: effect.effect,
          },
        });
        break;

      case "lightning":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "bolt",
            params: {
              targetId,
              damage: effect.damage || 10,
              casterId: caster.id,
            },
          });
        }
        break;

      case "weather":
        this.sim.queuedCommands.push({
          type: "weather",
          params: {
            weather: effect.weather || "clear",
          },
        });
        break;

      case "spawn":
        this.sim.queuedCommands.push({
          type: "spawn",
          params: {
            unitType: effect.unitType || "skeleton",
            pos: targetPos,
            team: caster.team,
            count: effect.count || 1,
          },
        });
        break;

      case "teleport":
        this.sim.queuedCommands.push({
          type: "move",
          params: {
            unitId: caster.id,
            pos: targetPos,
          },
        });
        break;

      case "burrow":
        this.sim.queuedCommands.push({
          type: "burrow",
          params: {
            unitId: caster.id,
            duration: effect.duration || 10,
          },
        });
        break;

      case "charm":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "charm",
            params: {
              targetId,
              casterId: caster.id,
              duration: effect.duration || 100,
            },
          });
        }
        break;

      case "knockback":
        if (targetId && targetPos) {
          const dx = targetPos.x - caster.pos.x;
          const dy = targetPos.y - caster.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const force =
              typeof effect.force === "number"
                ? effect.force
                : Number(effect.force) || 5;
            this.sim.queuedCommands.push({
              type: "knockback",
              params: {
                targetId,
                dx: (dx / dist) * force,
                dy: (dy / dist) * force,
              },
            });
          }
        }
        break;

      case "status":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "status",
            params: {
              targetId,
              effect: (effect as any).status || "stun",
              duration: effect.duration || 10,
            },
          });
        }
        break;

      case "storm":
        this.sim.queuedCommands.push({
          type: "storm",
          params: {
            target: targetPos,
            radius: effect.radius || 10,
            damage: effect.damage || 5,
            duration: effect.duration || 10,
            casterId: caster.id,
          },
        });
        break;

      case "grapple":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "grapple",
            params: {
              casterId: caster.id,
              targetId,
            },
          });
        }
        break;

      case "jump":
        const impactDamage = effect.damage || 5;
        const impactRadius = effect.radius || 3;

        this.sim.queuedCommands.push({
          type: "jump",
          params: {
            unitId: caster.id,
            targetX: targetPos.x,
            targetY: targetPos.y,
            height: effect.height || 5,
            damage: impactDamage,
            radius: impactRadius,
            speed: effect.speed || 2,
          },
        });
        break;

      case "toss":
        if (targetId) {
          this.sim.queuedCommands.push({
            type: "toss",
            params: {
              casterId: caster.id,
              targetId,
              destination: targetPos,
            },
          });
        }
        break;
    }
  }
}
