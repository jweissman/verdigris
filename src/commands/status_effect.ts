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
    
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        const statusEffects = unit.meta.statusEffects || [];
        
        // Check if effect already exists
        const existingEffect = statusEffects.find((e: any) => e.type === effect.type);
        if (existingEffect) {
          // Refresh duration
          existingEffect.duration = Math.max(existingEffect.duration, effect.duration);
          return unit;
        } else {
          // Add new effect
          return {
            ...unit,
            meta: {
              ...unit.meta,
              statusEffects: [...statusEffects, effect]
            }
          };
        }
      }
      return unit;
    });
  }
}

export class UpdateStatusEffectsCommand extends Command {
  private transform: Transform;
  
  constructor(sim: any) {
    super(sim);
    this.transform = sim.getTransform();
  }
  
  execute(unitId: string | null, params: Record<string, any>): void {
    const targetId = params.unitId as string;
    
    if (!targetId) return;
    
    this.transform.mapUnits(unit => {
      if (unit.id === targetId) {
        const statusEffects = unit.meta.statusEffects || [];
        
        // Decrement durations and filter out expired
        const updatedEffects = statusEffects
          .map((effect: any) => ({
            ...effect,
            duration: effect.duration - 1
          }))
          .filter((effect: any) => effect.duration > 0);
        
        // Apply effect mechanics
        let chilled = false;
        let chillIntensity = 0;
        let stunned = false;
        
        updatedEffects.forEach((effect: any) => {
          switch (effect.type) {
            case 'chill':
              chilled = true;
              chillIntensity = effect.intensity;
              break;
            case 'stun':
              stunned = true;
              break;
            case 'burn':
              // Damage handled by StatusEffects rule via events
              break;
          }
        });
        
        return {
          ...unit,
          meta: {
            ...unit.meta,
            statusEffects: updatedEffects,
            chilled,
            chillIntensity: chilled ? chillIntensity : undefined,
            stunned
          }
        };
      }
      return unit;
    });
  }
}