import { Rule } from "./rule";
import type { Unit, UnitState } from "../types/Unit";
import { Abilities } from "./abilities";

export class MeleeCombat extends Rule {
  engagements: Map<string, string> = new Map(); // Maps unit IDs to their current combat target ID
  lastAttacks: Map<string, number> = new Map(); // Track last attack time for each unit
  apply = () => {
    // VECTORIZED: Reset attack states using typed arrays
    const arrays = this.sim.unitArrays;
    if (arrays) {
      const currentTick = this.sim.ticks;
      for (let i = 0; i < arrays.capacity; i++) {
        if (arrays.active[i] === 0) continue;
        
        // Check if unit is in attack state and needs reset
        if (arrays.state[i] === 2) { // 2 = attack state
          const unitId = arrays.unitIds[i];
          const meta = this.sim.unitColdData.get(unitId);
          const lastAttacked = meta?.meta?.lastAttacked;
          
          if (lastAttacked && (currentTick - lastAttacked) > 2) {
            // Reset to idle
            arrays.state[i] = 0; // 0 = idle
          }
        }
      }
    } else {
      // Fallback for non-SoA mode
      for (const unit of this.sim.units) {
        if (unit.state === 'attack' && unit.meta.lastAttacked) {
          const ticksSinceAttack = this.sim.ticks - unit.meta.lastAttacked;
          if (ticksSinceAttack > 2) {
            this.sim.queuedCommands.push({
              type: 'meta',
              params: {
                unitId: unit.id,
                state: 'idle'
              }
            });
          }
        }
      }
    }
    
    this.engagements = new Map(); // Reset engagements each tick
    this.melee();
  }

  private hit = (attacker: Unit, target: Unit) => {
    if (attacker.hp <= 0 || target.hp <= 0) return; //
    this.engagements.set(attacker.id, target.id);
    this.lastAttacks.set(attacker.id, this.sim.ticks);
    
    // Queue command to update attack state and metadata
    this.sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: attacker.id,
        meta: { lastAttacked: this.sim.ticks },
        state: 'attack'
      }
    });
    
    this.sim.queuedEvents.push({
      kind: 'damage',
      source: attacker.id,
      target: target.id,
      meta: {
        amount: attacker.dmg || 1,
        aspect: 'impact' // Use 'impact' instead of 'physical'
      }
    });
  }
  
  melee = () => {
    // Use batched pairwise checking for efficiency
    const meleeRange = 1.5;
    
    // Register melee combat checks as a batched intent
    this.pairwise((attacker, target) => {
      // Skip if attacker already engaged
      if (this.engagements.has(attacker.id)) return;
      
      // Skip invalid attackers
      if (attacker.hp <= 0) return;
      if (attacker.meta.jumping) return;
      if (attacker.tags?.includes('noncombatant')) return;
      
      // Skip invalid targets
      if (target.hp <= 0) return;
      if (target.meta.jumping) return;
      if (target.tags?.includes('noncombatant')) return;
      
      // Only attack enemies
      if (attacker.team === target.team) return;
      
      // Queue halt command to stop movement
      this.sim.queuedCommands.push({
        type: 'halt',
        params: { unitId: attacker.id }
      });
      this.hit(attacker, target);
    }, meleeRange);
  };
}
