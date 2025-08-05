import { describe, expect, it } from "bun:test";
import { Simulator } from "../src/simulator";
import Encyclopaedia from "../src/dmg/encyclopaedia";
import DSL from "../src/rules/dsl";

describe("DSL Debug", () => {
  it("should debug DSL evaluation for priest radiant ability", () => {
    const sim = new Simulator(10, 10);
    
    const priest = Encyclopaedia.unit('priest');
    priest.pos = { x: 5, y: 5 };
    sim.addUnit(priest);
    
    const ghost = Encyclopaedia.unit('ghost');
    ghost.pos = { x: 6, y: 5 }; // Adjacent
    sim.addUnit(ghost);
    
    console.log('=== DSL DEBUG ===');
    
    // Test DSL evaluation directly
    try {
      const closestEnemy = DSL.evaluate('closest.enemy()', priest, sim);
      console.log('closest.enemy() result:', closestEnemy);
      
      if (closestEnemy) {
        const distance = DSL.evaluate('distance(closest.enemy()?.pos)', priest, sim);
        console.log('distance to closest enemy:', distance);
        
        const shouldTrigger = DSL.evaluate('distance(closest.enemy()?.pos) <= 2', priest, sim);
        console.log('Should trigger radiant (distance <= 2):', shouldTrigger);
      }
    } catch (error) {
      console.error('DSL evaluation error:', error);
    }
    
    // Test if abilities are being processed
    console.log('\nPriest abilities:', Object.keys(priest.abilities));
    console.log('Radiant ability details:', {
      trigger: priest.abilities.radiant.trigger,
      target: priest.abilities.radiant.target,
      cooldown: priest.abilities.radiant.cooldown
    });
    
    expect(true).toBe(true); // Just for debugging
  });
});