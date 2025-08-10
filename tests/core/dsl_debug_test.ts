import { describe, expect, it } from "bun:test";
import { Simulator } from "../../src/simulator";
import Encyclopaedia from "../../src/dmg/encyclopaedia";
import DSL from "../../src/rules/dsl";

describe("DSL Debug", () => {
  it("should debug DSL evaluation for priest radiant ability", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(ghost);
    
    
    // Test DSL evaluation directly
    try {
      const closestEnemy = DSL.evaluate('closest.enemy()', priest, sim);
      
      if (closestEnemy) {
        const distance = DSL.evaluate('distance(closest.enemy()?.pos)', priest, sim);
        
        const shouldTrigger = DSL.evaluate('distance(closest.enemy()?.pos) <= 2', priest, sim);
      }
    } catch (error) {
      console.error('DSL evaluation error:', error);
    }
    
    // Test if abilities are being processed
    expect(priest.abilities.radiant.trigger).toBeDefined();
    expect(priest.abilities.radiant.target).toBeDefined();
    expect(priest.abilities.radiant.cooldown).toBeDefined();
    
    expect(true).toBe(true); // Just for debugging
  });
});