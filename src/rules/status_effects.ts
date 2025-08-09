import { Rule } from "./rule";
import { Unit } from "../sim/types";

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
    this.sim.units = this.sim.units.map(unit => {
      if (unit.meta.statusEffects) {
        unit.meta.statusEffects = unit.meta.statusEffects
          .map(effect => ({ ...effect, duration: effect.duration - 1 }))
          .filter(effect => effect.duration > 0);

        // Apply status effect mechanics
        this.applyStatusEffectMechanics(unit);
      }
      return unit;
    });
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
      if (!unit.meta.statusEffects) {
        unit.meta.statusEffects = [];
      }

      // Add or refresh chill effect
      const existingChill = unit.meta.statusEffects.find(effect => effect.type === 'chill');
      if (existingChill) {
        existingChill.duration = Math.max(existingChill.duration, 30); // Refresh duration
      } else {
        unit.meta.statusEffects.push({
          type: 'chill',
          duration: 30, // 3.75 seconds at 8fps
          intensity: 0.5, // 50% movement speed reduction
          source: event.source
        });
        // console.log(`${unit.id} is chilled!`);
      }
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