import { Rule } from "./rule";
import type { Unit, UnitState } from "../sim/types";

export class MeleeCombat extends Rule {
  apply = () => this.pairwise((a: Unit, b: Unit) => {
    if (a.jumping || b.jumping) return;
    // console.log(`[MeleeCombat] Checking combat between ${a.id} (${a.sprite}) and ${b.id} (${b.sprite}) at (${a.pos.x},${a.pos.y}) and (${b.pos.x},${b.pos.y})`);
    if (a.team !== b.team && a.hp > 0 && b.hp > 0) { //} && a.state !== 'dead' && b.state !== 'dead') {
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.1) {
        // Combat! Set both units to attack state
        a.state = 'attack';
        // a.posture = 'fight';
        a.intendedTarget = b.id;
        a.intendedMove = { x: 0, y: 0 }; // Stop moving

        // b.posture = 'fight';
        b.state = 'attack';
        b.intendedTarget = a.id;
        b.intendedMove = { x: 0, y: 0 }; // Stop moving
        
        // console.log(`⚔️  Combat: ${a.sprite} vs ${b.sprite} at (${a.pos.x},${a.pos.y})`);
        
        // const oldHpA = a.hp;
        // const oldHpB = b.hp;
        
        a.hp -= 1;
        b.hp -= 1;

        
        // console.log(`   ${a.sprite}: ${oldHpA} → ${a.hp} HP`);
        // console.log(`   ${b.sprite}: ${oldHpB} → ${b.hp} HP`);
        
        // Check for deaths
        if (a.hp <= 0) { //} && a.state !== 'dead') {
          a.state = 'dead';
          // b.state = 'idle';
          // console.log(`💀 ${a.sprite} died at (${a.pos.x},${a.pos.y})!`);
        }
        if (b.hp <= 0) { //} && b.state !== 'dead') {
          // a.state = 'idle';
          b.state = 'dead';
          // console.log(`💀 ${b.sprite} died at (${b.pos.x},${b.pos.y})!`);
        }

        
      }
    }
  });
}
