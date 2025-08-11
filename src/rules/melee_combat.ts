import { Rule } from "./rule";
import type { Unit, UnitState } from "../types/Unit";
import { Abilities } from "./abilities";

export class MeleeCombat extends Rule {
  engagements: Map<string, string> = new Map(); // Maps unit IDs to their current combat target ID
  lastAttacks: Map<string, number> = new Map(); // Track last attack time for each unit
  apply = () => {
    this.engagements = new Map(); // Reset engagements each tick
    this.melee();
  }

  private hit = (attacker: Unit, target: Unit) => {
    if (attacker.hp <= 0 || target.hp <= 0) return; //
    this.engagements.set(attacker.id, target.id);
    this.lastAttacks.set(attacker.id, this.sim.ticks);
    
    // Track last attack time for rendering and set attack state
    attacker.meta.lastAttacked = this.sim.ticks;
    attacker.state = 'attack'; // Set attack state for rendering
    
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
    // Use spatial hash for efficient collision detection
    const meleeRange = 1.5;
    
    for (const unit of this.sim.units) {
      if (this.engagements.has(unit.id)) continue; // Already engaged
      if (unit.hp <= 0) continue;
      if (unit.meta?.jumping) continue;
      if (unit.tags?.includes('noncombatant')) continue;
      
      // Query nearby units using spatial hash
      const nearbyUnits = this.sim.getUnitsNear(unit.pos.x, unit.pos.y, meleeRange);
      
      for (const target of nearbyUnits) {
        if (target.id === unit.id) continue;
        if (this.engagements.has(unit.id)) break; // Stop if we found a target
        if (target.hp <= 0) continue;
        if (target.meta?.jumping) continue;
        if (target.tags?.includes('noncombatant')) continue;
        
        if (unit.team !== target.team) {
          const dx = unit.pos.x - target.pos.x;
          const dy = unit.pos.y - target.pos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < meleeRange) {
            unit.intendedMove = { x: 0, y: 0 }; // Stop to fight
            this.hit(unit, target);
            break; // Only engage one target at a time
          }
        }
      }
    }
  };
}
