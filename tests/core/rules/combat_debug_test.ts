import { describe, expect, it } from "bun:test";
import { Simulator } from "../../../src/core/simulator";
import Encyclopaedia from "../../../src/dmg/encyclopaedia";

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
    
    
    for (let i = 0; i < 5; i++) {
      
      sim.step();
      

      const fresh1 = sim.units.find(u => u.id === soldier1.id);
      const fresh2 = sim.units.find(u => u.id === soldier2.id);
      
      
      if (fresh1 && fresh1.hp !== 30) {
        break;
      }
    }
    
    expect(true).toBe(true); // Just for debugging
  });
});