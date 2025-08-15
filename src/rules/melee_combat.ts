import { Rule } from "./rule";
import type { TickContext } from "../core/tick_context";
import type { Unit } from "../types/Unit";

export class MeleeCombat extends Rule {
  private engagements: Map<string, string> = new Map();
  private lastAttacks: Map<string, number> = new Map();

  execute(context: TickContext): void {
    // Reset attack states
    const currentTick = context.getCurrentTick();
    
    // Process attack resets every tick for correct behavior
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
    
    // OPTIMIZATION: Use spatial queries instead of O(n²) pairwise
    // Process each unit and find nearby enemies
    const allUnits = context.getAllUnits();
    for (const attacker of allUnits) {
      // Skip if attacker already engaged
      if (this.engagements.has(attacker.id)) continue;
      
      // Skip invalid attackers
      if (attacker.hp <= 0) continue;
      if (attacker.meta?.jumping) continue;
      if (attacker.tags?.includes('noncombatant')) continue;
      
      // Find nearby targets using spatial query
      const nearbyUnits = context.findUnitsInRadius(attacker.pos, meleeRange);
      
      for (const target of nearbyUnits) {
        if (target.id === attacker.id) continue;
        
        // Skip invalid targets
        if (target.hp <= 0) continue;
        if (target.meta?.jumping) continue;
        if (target.tags?.includes('noncombatant')) continue;
        
        // Only attack enemies
        if (attacker.team === target.team) continue;
        
        // Process hit and stop checking more targets
        this.processHit(context, attacker, target);
        break; // Only attack one target per attacker
      }
    }
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
    
    // Queue damage command (not event!)
    context.queueCommand({
      type: 'damage',
      params: {
        targetId: target.id,
        amount: attacker.dmg || 1,
        aspect: 'physical',
        sourceId: attacker.id
      }
    });
  }
}