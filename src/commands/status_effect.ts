import { Command } from "../rules/command";
import { Transform } from "../core/transform";

export class ApplyStatusEffectCommand extends Command {
  private transform: Transform;

  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    const effect = params.effect;

    if (!targetId || !effect) return;

    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = targetUnit.meta.statusEffects || [];

      const existingEffect = statusEffects.find(
        (e: any) => e.type === effect.type,
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

export class UpdateStatusEffectsCommand extends Command {
  constructor(sim: any, transform: Transform) {
    super(sim, transform);
  }

  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;

    if (!targetId) return;

    const targetUnit = this.sim.units.find((u) => u.id === targetId);
    if (targetUnit) {
      const statusEffects = targetUnit.meta.statusEffects || [];

      const updatedEffects = statusEffects
        .map((effect: any) => ({
          ...effect,
          duration: effect.duration - 1,
        }))
        .filter((effect: any) => effect.duration > 0);

      let chilled = false;
      let chillIntensity = 0;
      let stunned = false;

      updatedEffects.forEach((effect: any) => {
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
