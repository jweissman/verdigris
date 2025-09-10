import { Command } from "../rules/command";
import { Transform } from "../core/transform";
import { ApplyStatusEffectParams, UpdateStatusEffectsParams, StatusEffect } from "../types/CommandParams";

export class ApplyStatusEffectCommand extends Command<ApplyStatusEffectParams> {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: ApplyStatusEffectParams): void {
    const targetId = params.unitId;
    const effect = params.effect;

    if (!targetId || !effect) return;

    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = (targetUnit.meta.statusEffects as StatusEffect[] | undefined) || [];

      const existingEffect = statusEffects.find(
        (e) => e.type === effect.type,
      );
      if (existingEffect) {
        existingEffect.duration = Math.max(
          existingEffect.duration,
          effect.duration,
        );
      } else {
        targetUnit.meta.statusEffects = [...statusEffects, effect];
      }
    }
  }
}

export class UpdateStatusEffectsCommand extends Command<UpdateStatusEffectsParams> {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: UpdateStatusEffectsParams): void {
    const targetId = params.unitId;

    if (!targetId) return;

    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = (targetUnit.meta.statusEffects as StatusEffect[] | undefined) || [];

      const updatedEffects = statusEffects
        .map((effect) => ({
          ...effect,
          duration: effect.duration - 1,
        }))
        .filter((effect) => effect.duration > 0);

      let chilled = false;
      let chillIntensity = 0;
      let stunned = false;

      updatedEffects.forEach((effect) => {
        switch (effect.type) {
          case "chill":
            chilled = true;
            chillIntensity = effect.intensity;
            break;
          case "stun":
            stunned = true;
            break;
          case "burn":
            break;
        }
      });

      targetUnit.meta.statusEffects = updatedEffects;
      targetUnit.meta.chilled = chilled;
      targetUnit.meta.chillIntensity = chilled ? chillIntensity : undefined;
      targetUnit.meta.stunned = stunned;
    }
  }
}
