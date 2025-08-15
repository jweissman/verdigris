import { Rule } from "./rule";
import { Unit } from "../types/Unit";
import type { TickContext } from '../core/tick_context';

export class Perdurance extends Rule {
  constructor() {
    super();
  }
  execute(context: TickContext): void {
    // Perdurance damage resistance is now handled directly in EventHandler.handleDamage()
    // This rule is kept for backwards compatibility but does nothing
    return;
  }
  
  private processPendingDamage(context: TickContext, unit: Unit): void {
    const damage = unit.meta.pendingDamage;
    if (!damage) return;
    
    // Ensure meta exists
    const damageAmount = damage.amount || 1;
    const damageAspect = damage.aspect || 'physical';
    const source = damage.source || 'unknown';
    
    // Check if damage should be blocked completely
    if (this.shouldBlockDamage(context, unit, damageAspect)) {
      // Block damage - clear pending damage
      context.queueCommand({
        type: 'meta',
        params: {
          unitId: unit.id,
          meta: {
            pendingDamage: undefined
          }
        }
      });
      return;
    }
    
    // Modify damage amount based on perdurance type
    const modifiedAmount = this.modifyDamageAmount(context, unit, damageAmount, damageAspect);
    
    // Apply the damage
    context.queueEvent({
      kind: 'damage',
      source: source,
      target: unit.id,
      meta: {
        amount: modifiedAmount,
        aspect: damageAspect
      }
    });
    
    // Clear pending damage
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: unit.id,
        meta: {
          pendingDamage: undefined
        }
      }
    });
  }

  private modifyDamageAmount(context: TickContext, target: Unit, amount: number, aspect: string): number {
    const perdurance = target.meta.perdurance;
    let modifiedAmount = amount;
    
    if (perdurance) {
      switch (perdurance) {
        case 'sturdiness':
          // Cap all damage to maximum 1 (resistant to burst, weak to chip)
          if (modifiedAmount > 1) {
            modifiedAmount = 1;
          }
          break;
        
        case 'swarm':
          // NOTE: Swarm units should attack with population damage so we do actually need to track it here?
          // how are we even tracking swarm population if this is empty rule??
          break;
      }
    }
    
    // Handle brittle (frozen) units - take double damage
    if (target.meta.brittle) {
      modifiedAmount *= 2;
    }
    
    return modifiedAmount;
  }

  private shouldBlockDamage(context: TickContext, unit: Unit, damageAspect?: string): boolean {
    const perdurance = unit.meta.perdurance;
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
          return context.getRandom() < 0.5;
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