import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";
import Encyclopaedia from "../src/dmg/encyclopaedia";

describe("Combat Debug", () => {
  it("should debug actual HP changes vs console output", () => {
    const sim = new Simulator(10, 10);
    
    const soldier1 = Encyclopaedia.unit('soldier');
    soldier1.pos = { x: 5, y: 5 };
    soldier1.team = 'friendly';
    sim.addUnit(soldier1);
    
    const soldier2 = Encyclopaedia.unit('soldier');
    soldier2.pos = { x: 6, y: 5 }; // Adjacent
    soldier2.team = 'hostile'; // Different team
    sim.addUnit(soldier2);
    
    console.log('=== COMBAT DEBUG ===');
    console.log('Initial HP:', soldier1.id, soldier1.hp, soldier2.id, soldier2.hp);
    console.log('Initial positions:', soldier1.pos, soldier2.pos);
    console.log('Teams:', soldier1.team, soldier2.team);
    
    for (let i = 0; i < 5; i++) {
      console.log(`\n--- Step ${i + 1} ---`);
      console.log('Pre-step HP:', soldier1.id, soldier1.hp, soldier2.id, soldier2.hp);
      
      sim.step();
      
      // Get fresh references from simulation
      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      
      console.log('Post-step HP (original refs):', soldier1.id, soldier1.hp, soldier2.id, soldier2.hp);
      console.log('Post-step HP (fresh refs):', fresh1?.id, fresh1?.hp, fresh2?.id, fresh2?.hp);
      console.log('Post-step meta (fresh):', fresh1?.meta, fresh2?.meta);
      
      if (fresh1 && fresh1.hp !== 30) {
        console.log('FRESH REFERENCE SHOWS DAMAGE!');
        break;
      }
    }
    
    expect(true).toBe(true); // Just for debugging
  });
});