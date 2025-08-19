import { Command } from "../rules/command";
import type { AbilityEffect } from "../types/AbilityEffect";

/**
 * Command to execute ability effects in batch
 * This moves the effect processing out of the Abilities rule for better performance
 */
export class EffectsCommand extends Command {
  execute(
    unitId: string | null,
    params: { effects: AbilityEffect[]; casterId: string; targetId: string },
  ): void {
    const caster = this.sim.units.find((u) => u.id === params.casterId);
    const target = this.sim.units.find((u) => u.id === params.targetId);

    if (!caster || !target) return;

    for (const effect of params.effects) {
      this.processEffect(effect, caster, target);
    }
  }

  private processEffect(effect: AbilityEffect, caster: any, target: any): void {
    switch (effect.type) {
      case "damage":
        this.sim.queuedCommands.push({
          type: "damage",
          params: {
            targetId: target.id,
            amount: effect.amount || 0,
            sourceId: caster.id,
          },
        });
        break;

      case "heal":
        this.sim.queuedCommands.push({
          type: "heal",
          params: {
            targetId: target.id,
            amount: effect.amount || 0,
            sourceId: caster.id,
          },
        });
        break;

      case "projectile":
        const projectileTarget = target.pos || target;
        this.sim.queuedCommands.push({
          type: "projectile",
          params: {
            origin: caster.pos,
            destination: projectileTarget,
            speed: effect.speed || 1,
            damage: effect.damage || 0,
            casterId: caster.id,
            targetId: target.id,
            effect: effect.effect,
            style: effect.style || "bullet",
          },
        });
        break;

      case "aoe":
        const center =
          (effect as any).center === "target" ? target.pos : caster.pos;
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
        this.sim.queuedCommands.push({
          type: "bolt",
          params: {
            targetId: target.id,
            damage: effect.damage || 10,
            casterId: caster.id,
          },
        });
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
        const spawnPos = target.pos || target;
        this.sim.queuedCommands.push({
          type: "spawn",
          params: {
            unitType: effect.unitType || "skeleton",
            pos: spawnPos,
            team: caster.team,
            count: effect.count || 1,
          },
        });
        break;

      case "teleport":
        const teleportTarget = target.pos || target;
        this.sim.queuedCommands.push({
          type: "move",
          params: {
            unitId: caster.id,
            pos: teleportTarget,
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
        this.sim.queuedCommands.push({
          type: "charm",
          params: {
            targetId: target.id,
            casterId: caster.id,
            duration: effect.duration || 100,
          },
        });
        break;

      case "knockback":
        const dx = target.pos.x - caster.pos.x;
        const dy = target.pos.y - caster.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const force =
            typeof effect.force === "number"
              ? effect.force
              : Number(effect.force) || 5;
          this.sim.queuedCommands.push({
            type: "knockback",
            params: {
              targetId: target.id,
              dx: (dx / dist) * force,
              dy: (dy / dist) * force,
            },
          });
        }
        break;

      case "status":
        this.sim.queuedCommands.push({
          type: "status",
          params: {
            targetId: target.id,
            effect: (effect as any).status || "stun",
            duration: effect.duration || 10,
          },
        });
        break;

      default:
        console.warn(`Unknown effect type: ${effect.type}`);
    }
  }
}
