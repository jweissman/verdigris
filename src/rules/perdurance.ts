import { Rule } from "./rule";
import { Unit } from "../sim/types";

export class Perdurance extends Rule {
  apply = () => {
    // Process damage events and apply perdurance rules
    this.sim.queuedEvents = this.sim.queuedEvents.map(event => {
      if (event.kind === 'damage') {
        const target = this.sim.units.find(u => u.id === event.target);
        if (target) {
          // Check if damage should be blocked completely
          if (this.shouldBlockDamage(target, event.meta.aspect)) {
            // console.log(`${target.id} (${target.meta.perdurance}) resists ${event.meta.aspect} damage`);
            return null; // Block this damage event
          }
          // Modify damage amount based on perdurance type
          const modifiedEvent = this.modifyDamage(event, target);
          return modifiedEvent;
        }
      }
      return event; // Allow other events through unchanged
    }).filter(event => event !== null); // Remove blocked events
  }

  private modifyDamage(event: any, target: Unit): any {
    const perdurance = target.meta?.perdurance;
    if (!perdurance) return event;

    const modifiedEvent = { 
      ...event,
      meta: { ...event.meta } // Deep clone the meta object
    };
    
    switch (perdurance) {
      case 'sturdiness':
        // Cap all damage to maximum 1 (resistant to burst, weak to chip)
        const originalAmount = modifiedEvent.meta.amount;
        if (modifiedEvent.meta.amount > 1) {
          modifiedEvent.meta.amount = 1;
          // console.log(`[Perdurance] Sturdiness: reduced damage from ${originalAmount} to 1`);
        }
        break;
      
      case 'swarm':
        // NOTE: Swarm units should attack with population damage so we do actually need to track it here?
        // how are we even tracking swarm population if this is empty rule??
        break;
    }
    
    // Handle brittle (frozen) units - take double damage
    if (target.meta.brittle) {
      // console.log(`${target.id} is brittle, taking double damage!`);
      modifiedEvent.meta.amount *= 2;
    }
    
    return modifiedEvent;
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

      case 'sturdiness':
        // Constructs: reduce all damage to maximum 1 (resistant to burst, weak to chip)
        return false; // Allow damage but we'll modify it below
      
      case 'swarm':
        // Population-based health: each damage kills some of the swarm
        return false; // Allow damage but handle it differently
      
      default:
        return false; // Unknown perdurance type, no resistance
    }
  }
}