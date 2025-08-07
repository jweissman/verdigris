import { Rule } from "./rule";
import type { Unit, UnitState } from "../sim/types";

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
        amount: attacker.abilities?.melee?.config?.damage || 1,
        aspect: 'impact' // Use 'impact' instead of 'physical'
      }
    });
  }
  
  melee = () => this.pairwise((a: Unit, b: Unit) => {
    if (this.engagements.has(a.id)) return; // Already engaged
    if (this.lastAttacks.has(a.id) && this.sim.ticks - this.lastAttacks.get(a.id)! < (a.abilities?.melee?.cooldown || 10)) return; // Still on cooldown
    if (a.meta?.jumping || b.meta?.jumping) return;
    // Skip combat for noncombatant units
    if (a.tags?.includes('noncombatant') || b.tags?.includes('noncombatant')) return;
    if (a.team !== b.team && a.hp > 0 && b.hp > 0) {
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const range = a.abilities?.melee?.config?.range || 1.5; // Default melee range
      if (dist < range) {
        a.intendedMove = { x: 0, y: 0 }; // Stop to fight
        this.hit(a, b);
      }
    }
  });
}
