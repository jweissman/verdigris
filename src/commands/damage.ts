import { Command, CommandParams } from "../rules/command";
import { Transform } from "../core/transform";

/**
 * Damage command - deals damage to a target unit
 * Params:
 *   targetId: string - ID of the unit to damage
 *   amount: number - Amount of damage to deal
 *   aspect?: string - Type of damage (physical, radiant, fire, etc.)
 *   origin?: {x: number, y: number} - Origin point of damage for directional effects
 */
export class Damage extends Command {
  execute(unitId: string | null, params: CommandParams): void {
    const targetId = params.targetId as string;
    const amount = params.amount as number;
    const aspect = (params.aspect as string) || "physical";
    const origin = params.origin as { x: number; y: number } | undefined;

    const target = this.sim.units.find((u) => u.id === targetId);
    if (!target) {
      return;
    }

    if (typeof amount !== "number" || isNaN(amount)) {
      return;
    }

    const transform = this.sim.getTransform();

    let finalDamage = amount;

    if (target.meta?.brittle) {
      finalDamage = finalDamage * 2;
    }

    if (
      target.meta?.damageReduction &&
      typeof target.meta.damageReduction === "number"
    ) {
      finalDamage = Math.floor(finalDamage * (1 - target.meta.damageReduction));
    }

    if (target.meta?.armor && typeof target.meta.armor === "number") {
      finalDamage = Math.max(0, finalDamage - target.meta.armor);
    }

    const perdurance = target.meta?.perdurance;
    if (perdurance) {
      if (perdurance === "spectral" && aspect === "physical") {
        return; // No damage
      }

      if (perdurance === "undead" && aspect === "physical") {
        return; // No damage
      }

      if (perdurance === "fiendish" && aspect === "physical") {
        finalDamage = Math.floor(finalDamage * 0.5);
      }

      if (perdurance === "sturdiness") {
        finalDamage = 1;
      }

      if (perdurance === "swarm") {
        finalDamage = amount;
      }
    }

    const newHp = Math.max(0, target.hp - finalDamage); // Clamp HP to minimum 0

    const damageTaken = target.meta?.segment ? finalDamage : undefined;

    transform.updateUnit(targetId, {
      hp: newHp,
      state: newHp <= 0 ? "dead" : target.state,
      meta: {
        ...target.meta,
        impactFrame: this.sim.ticks,
        damageTaken:
          damageTaken !== undefined ? damageTaken : target.meta?.damageTaken,
      },
    });

    if (params.sourceId) {
      const sourceId = params.sourceId as string;
      const source = this.sim.units.find((u) => u.id === sourceId);
      if (source) {
        transform.updateUnit(sourceId, {
          meta: {
            ...source.meta,
            impactFrame: this.sim.ticks,
          },
        });
      }
    }
  }
}
