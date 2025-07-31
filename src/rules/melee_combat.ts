import { Rule } from "./rule";
import type { Unit } from "../sim/types";

export class MeleeCombat extends Rule {
  apply = () => this.pairwise((a: Unit, b: Unit) => {
    if (a.team !== b.team && a.state !== 'dead' && b.state !== 'dead') {
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.1) {
        // Combat! Set both units to attack state
        a.state = 'attack';
        b.state = 'attack';
        
        console.log(`⚔️  Combat: ${a.sprite} vs ${b.sprite} at (${a.pos.x},${a.pos.y})`);
        
        const oldHpA = a.hp;
        const oldHpB = b.hp;
        
        a.hp -= 1;
        b.hp -= 1;
        
        console.log(`   ${a.sprite}: ${oldHpA} → ${a.hp} HP`);
        console.log(`   ${b.sprite}: ${oldHpB} → ${b.hp} HP`);
        
        // Check for deaths
        if (a.hp <= 0 && a.state !== 'dead') {
          a.state = 'dead';
          console.log(`💀 ${a.sprite} died at (${a.pos.x},${a.pos.y})!`);
        }
        if (b.hp <= 0 && b.state !== 'dead') {
          b.state = 'dead';
          console.log(`💀 ${b.sprite} died at (${b.pos.x},${b.pos.y})!`);
        }
      }
    }
  });
}
