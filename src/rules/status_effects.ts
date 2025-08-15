import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from '../core/tick_context';

export interface StatusEffect {
  type: 'chill' | 'stun' | 'burn' | 'poison';
  duration: number; // ticks remaining
  intensity: number; // effect strength
  source?: string; // unit that applied it
}

export class StatusEffects extends Rule {
  constructor() {
    super();
  }
  execute(context: TickContext): void {
    // Note: TickContext doesn't expose queuedEvents directly
    // We'll check for units with status effect triggers or existing effects
    
    // Check for units that need status effects applied or updated
    for (const unit of context.getAllUnits()) {
      // Apply status effects if unit has chill triggers
      if (unit.meta.chillTrigger) {
        this.applyChillFromTrigger(context, unit);
      }
      
      // Update existing status effects
      if (unit.meta.statusEffects && unit.meta.statusEffects.length > 0) {
        this.updateStatusEffects(context, unit);
      }
      
      // Apply mechanics for active status effects
      this.applyStatusEffectMechanics(context, unit);
    }
  }

  private applyChillFromTrigger(context: TickContext, unit: Unit): void {
    const trigger = unit.meta.chillTrigger;
    const centerPos = trigger.position || unit.pos;
    const radius = trigger.radius || 2;

    const affectedUnits = context.getAllUnits().filter(target => {
      const distance = Math.sqrt(
        Math.pow(target.pos.x - centerPos.x, 2) + 
        Math.pow(target.pos.y - centerPos.y, 2)
      );
      return distance <= radius;
    });

    affectedUnits.forEach(target => {
      // Queue command to apply chill effect
      context.queueCommand({
        type: 'applyStatusEffect',
        params: {
          unitId: target.id,
          effect: {
            type: 'chill',
            duration: 30, // 3.75 seconds at 8fps
            intensity: 0.5, // 50% movement speed reduction
            source: unit.id
          }
        }
      });
    });
    
    // Clear the trigger
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          chillTrigger: undefined
        }
      }
    });
  }

  private updateStatusEffects(context: TickContext, unit: Unit): void {
    const statusEffects = unit.meta.statusEffects || [];
    const updatedEffects = statusEffects.map(effect => ({
      ...effect,
      duration: effect.duration - 1
    })).filter(effect => effect.duration > 0);
    
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          statusEffects: updatedEffects.length > 0 ? updatedEffects : undefined
        }
      }
    });
  }
  
  private applyStatusEffectMechanics(context: TickContext, unit: Unit): void {
    const statusEffects = unit.meta.statusEffects || [];
    
    statusEffects.forEach(effect => {
      switch (effect.type) {
        case 'chill':
          // Queue chill effect
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: {
                chilled: true,
                chillIntensity: effect.intensity
              }
            }
          });
          break;
        case 'stun':
          // Queue stun effect
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              meta: { stunned: true }
            }
          });
          break;
        case 'burn':
          // Deal damage over time
          if (context.getCurrentTick() % 8 === 0) { // Every second
            context.queueEvent({
              kind: 'damage',
              source: effect.source || 'burn',
              target: unit.id,
              meta: {
                aspect: 'heat',
                amount: effect.intensity
              }
            });
          }
          break;
      }
    });

    // Clean up expired status flags
    if (statusEffects.length === 0) {
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            chilled: undefined,
            chillIntensity: undefined,
            stunned: undefined
          }
        }
      });
    }
  }
}