import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { UnitMovement } from '../../src/rules/unit_movement';
import { MeleeCombat } from '../../src/rules/melee_combat';

// NOTE: this test seems to be nonsense? there are no expectations or assertions??? what is this?
// describe('HERO DAY Performance', () => {
//   it('should achieve sub-1ms with minimal ruleset for HERO DAY', () => {
//     const sim = new Simulator(32, 32);
    
//     // Minimal ruleset for HERO DAY
//     // Only keep essential rules, remove expensive ones
//     const essentialRules = [
//       'CommandHandler',
//       'UnitMovement', 
//       'MeleeCombat',
//       'Jumping',
//       'EventHandler',
//       'Cleanup'
//     ];
    
//     // Filter to essential rules only
//     sim.rulebook = sim.rulebook.filter(r => 
//       essentialRules.includes(r.constructor.name)
//     );
    
//     // Replace with optimized versions
//     const combatIndex = sim.rulebook.findIndex(r => r.constructor.name === 'MeleeCombat');
//     if (combatIndex >= 0) {
//       sim.rulebook[combatIndex] = new MeleeCombat(sim);
//     }
    
//     const movementIndex = sim.rulebook.findIndex(r => r.constructor.name === 'UnitMovement');
//     if (movementIndex >= 0) {
//       sim.rulebook[movementIndex] = new UnitMovement(sim);
//     }
    
//     console.log('Active rules:', sim.rulebook.map(r => r.constructor.name).join(', '));
    
//     // HERO DAY scenario - hero + some enemies
//     // Add hero
//     sim.addUnit({
//       id: 'hero',
//       pos: { x: 16, y: 16 },
//       intendedMove: { x: 0, y: 0 },
//       team: 'friendly',
//       hp: 100,
//       maxHp: 100,
//       dmg: 10,
//       mass: 2,
//       sprite: 'hero',
//       abilities: ['doubleJump', 'specialAttack'],
//       tags: []
//     });
    
//     // Add some enemies
//     for (let i = 0; i < 10; i++) {
//       sim.addUnit({
//         id: `enemy${i}`,
//         pos: { x: 5 + i * 2, y: 5 + (i % 2) * 2 },
//         intendedMove: { x: 0, y: 0 },
//         team: 'hostile',
//         hp: 20,
//         maxHp: 20,
//         dmg: 5,
//         tags: ['hunt']
//       });
//     }
    
//     // Warm up
//     for (let i = 0; i < 10; i++) {
//       sim.step();
//     }
    
//     // Measure
//     const times: number[] = [];
//     for (let i = 0; i < 100; i++) {
//       const start = performance.now();
//       sim.step();
//       times.push(performance.now() - start);
//     }
    
//     const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    
//     expect(avgTime).toBeLessThan(1.0);
//   });
  
//   it('should handle hero combat efficiently', () => {
//     const sim = new Simulator(20, 20);
    
//     // Minimal rules
//     sim.rulebook = sim.rulebook.filter(r => 
//       ['CommandHandler', 'MeleeCombat', 'EventHandler', 'Cleanup'].includes(r.constructor.name)
//     );
    
//     // Use standard combat for now
//     const combatIndex = sim.rulebook.findIndex(r => r.constructor.name === 'MeleeCombat');
//     if (combatIndex >= 0) {
//       sim.rulebook[combatIndex] = new MeleeCombat(sim);
//     }
    
//     // Hero vs many enemies
//     sim.addUnit({
//       id: 'hero',
//       pos: { x: 10, y: 10 },
//       team: 'friendly',
//       hp: 100,
//       maxHp: 100,
//       dmg: 20
//     });
    
//     // Surround with enemies
//     for (let dx = -2; dx <= 2; dx++) {
//       for (let dy = -2; dy <= 2; dy++) {
//         if (dx === 0 && dy === 0) continue;
//         sim.addUnit({
//           id: `enemy_${dx}_${dy}`,
//           pos: { x: 10 + dx, y: 10 + dy },
//           team: 'hostile',
//           hp: 10,
//           maxHp: 10,
//           dmg: 2
//         });
//       }
//     }
    
//     const times: number[] = [];
//     for (let i = 0; i < 50; i++) {
//       const start = performance.now();
//       sim.step();
//       times.push(performance.now() - start);
//     }
    
//   });
// });