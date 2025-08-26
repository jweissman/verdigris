import { describe, test, expect } from "bun:test";
import { Simulator } from "../src/core/simulator";

describe("Debug Final Stun Step", () => {
  test("check what happens at duration 1", () => {
    const sim = new Simulator(20, 20);
    
    // Manually create a unit with stun duration 1
    const enemy = sim.addUnit({
      id: "enemy",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "hostile",
      meta: {
        stunned: true,
        stunDuration: 1
      }
    });
    
    console.log("Before step:", { 
      stunned: enemy.meta?.stunned, 
      duration: enemy.meta?.stunDuration 
    });
    
    // One step should clear it
    sim.step();
    
    const enemyAfter = sim.units.find(u => u.id === "enemy");
    console.log("After step:", { 
      stunned: enemyAfter?.meta?.stunned, 
      duration: enemyAfter?.meta?.stunDuration 
    });
    
    expect(enemyAfter?.meta?.stunned).toBeUndefined();
    expect(enemyAfter?.meta?.stunDuration).toBeUndefined();
  });
});