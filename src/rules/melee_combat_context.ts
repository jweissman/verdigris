import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";

/**
 * MeleeCombat rule using TickContext
 * No direct simulator access - only through context API
 */
export class MeleeCombatContext extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();

  execute(context: TickContext): void {
    // Reset attack states
    const currentTick = context.getCurrentTick();
    
    for (const unit of context.getAllUnits()) {
      if (unit.state === 'attack' && unit.meta?.lastAttacked) {
        const ticksSinceAttack = currentTick - unit.meta.lastAttacked;
        if (ticksSinceAttack > 2) {
          context.queueCommand({
            type: 'meta',
            params: {
              unitId: unit.id,
              state: 'idle'
            }
          });
        }
      }
    }
    
    this.engagements.clear();
    this.performMeleeCombat(context);
  }

  private performMeleeCombat(context: TickContext): void {
    const meleeRange = 1.5;
    
    // Use pairwise helper from base class
    this.pairwise(context, (attacker, target) => {
      // Skip if attacker already engaged
      if (this.engagements.has(attacker.id)) return;
      
      // Skip invalid attackers
      if (attacker.hp <= 0) return;
      if (attacker.meta?.jumping) return;
      if (attacker.tags?.includes('noncombatant')) return;
      
      // Skip invalid targets
      if (target.hp <= 0) return;
      if (target.meta?.jumping) return;
      if (target.tags?.includes('noncombatant')) return;
      
      // Only attack enemies
      if (attacker.team === target.team) return;
      
      // Process hit
      this.processHit(context, attacker, target);
    }, meleeRange);
  }

  private processHit(context: TickContext, attacker: Unit, target: Unit): void {
    if (attacker.hp <= 0 || target.hp <= 0) return;
    
    this.engagements.set(attacker.id, target.id);
    this.lastAttacks.set(attacker.id, context.getCurrentTick());
    
    // Queue halt command to stop movement
    context.queueCommand({
      type: 'halt',
      params: { unitId: attacker.id }
    });
    
    // Queue command to update attack state and metadata
    context.queueCommand({
      type: 'meta',
      params: {
        unitId: attacker.id,
        meta: { lastAttacked: context.getCurrentTick() },
        state: 'attack'
      }
    });
    
    // Queue damage command
    context.queueCommand({
      type: 'damage',
      params: {
        targetId: target.id,
        amount: attacker.dmg || 1,
        aspect: 'impact',
        sourceId: attacker.id
      }
    });
  }
}