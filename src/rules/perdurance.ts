import { Rule } from "./rule";
import { Unit } from "../sim/types";

export class Perdurance extends Rule {
  apply = () => {
    // Process damage events and apply perdurance rules
    this.sim.queuedEvents = this.sim.queuedEvents.filter(event => {
      if (event.kind === 'damage') {
        const target = this.sim.units.find(u => u.id === event.target);
        if (target && this.shouldBlockDamage(target, event.meta.aspect)) {
          console.log(`${target.id} (${target.meta.perdurance}) resists ${event.meta.aspect} damage`);
          return false; // Block this damage event
        }
      }
      return true; // Allow other events through
    });
  }

  private shouldBlockDamage(unit: Unit, damageAspect?: string): boolean {
    const perdurance = unit.meta?.perdurance;
    if (!perdurance) return false; // No special resistance

    switch (perdurance) {
      case 'spectral':
        // Ghosts only take damage from magic and environmental effects
        return !['radiant', 'force', 'heat', 'shock'].includes(damageAspect || 'physical');
      
      case 'undead': 
        // Undead take extra damage from radiant but resist physical
        if (damageAspect === 'radiant') return false; // Allow radiant damage
        if (damageAspect === 'physical' || !damageAspect) return true; // Block physical
        return false; // Allow other magical damage
      
      case 'fiendish':
        // Demons resist physical damage but are vulnerable to radiant
        if (damageAspect === 'radiant') return false; // Allow radiant damage  
        if (damageAspect === 'physical' || !damageAspect) {
          // 50% chance to resist physical damage
          return Math.random() < 0.5;
        }
        return false; // Allow other damage
      
      default:
        return false; // Unknown perdurance type, no resistance
    }
  }
}