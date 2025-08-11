import { Rule } from "./rule";
import { Unit } from "../types/Unit";

export interface StatusEffect {
  type: 'chill' | 'stun' | 'burn' | 'poison';
  duration: number; // ticks remaining
  intensity: number; // effect strength
  source?: string; // unit that applied it
}

export class StatusEffects extends Rule {
  apply = (): void => {
    // Process AoE events that apply status effects
    this.sim.queuedEvents = this.sim.queuedEvents.filter(event => {
      if (event.kind === 'aoe' && event.meta.aspect === 'chill') {
        this.applyChill(event);
        return false; // Remove the event since we handled it
      }
      return true;
    });

    // Update existing status effects on all units
    // TODO: Convert to commands for status effect updates
    for (const unit of this.sim.units) {
      if (unit.meta.statusEffects && unit.meta.statusEffects.length > 0) {
        // Queue command to update status effects
        this.sim.queuedCommands.push({
          type: 'updateStatusEffects',
          params: {
            unitId: unit.id
          }
        });
      }
    }
  }

  private applyChill(event: any): void {
    const centerPos = event.target;
    const radius = event.meta.radius || 2;

    const affectedUnits = this.sim.getRealUnits().filter(unit => {
      const distance = Math.sqrt(
        Math.pow(unit.pos.x - centerPos.x, 2) + 
        Math.pow(unit.pos.y - centerPos.y, 2)
      );
      return distance <= radius;
    });

    affectedUnits.forEach(unit => {
      // Queue command to apply chill effect
      this.sim.queuedCommands.push({
        type: 'applyStatusEffect',
        params: {
          unitId: unit.id,
          effect: {
            type: 'chill',
            duration: 30, // 3.75 seconds at 8fps
            intensity: 0.5, // 50% movement speed reduction
            source: event.source
          }
        }
      });
    });
  }

  private applyStatusEffectMechanics(unit: Unit): void {
    const statusEffects = unit.meta.statusEffects || [];
    
    statusEffects.forEach(effect => {
      switch (effect.type) {
        case 'chill':
          // Reduce movement speed (implemented in unit_movement rule)
          unit.meta.chilled = true;
          unit.meta.chillIntensity = effect.intensity;
          break;
        case 'stun':
          // Prevent movement and abilities
          unit.meta.stunned = true;
          break;
        case 'burn':
          // Deal damage over time
          if (this.sim.ticks % 8 === 0) { // Every second
            this.sim.queuedEvents.push({
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
      delete unit.meta.chilled;
      delete unit.meta.chillIntensity;
      delete unit.meta.stunned;
    }
  }
}