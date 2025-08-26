import { describe, test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Bolt Stun Debug", () => {
  test("debug stun duration countdown", () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: "hero",
      pos: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      team: "friendly"
    });
    
    sim.addUnit({
      id: "enemy",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "hostile"
    });
    
    // Cast bolt at enemy
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: { x: 10, y: 10 }
    });
    
    sim.step(); // Process bolt
    sim.step(); // Process AOE
    sim.step(); // Process meta/stun
    
    const enemy = sim.units.find(u => u.id === "enemy");
    console.log("After stun applied:", {
      stunned: enemy?.meta?.stunned,
      stunDuration: enemy?.meta?.stunDuration
    });
    
    // Track stun duration over time
    for (let i = 0; i < 25; i++) {
      sim.step();
      const e = sim.units.find(u => u.id === "enemy");
      console.log(`Tick ${i+1}:`, {
        stunned: e?.meta?.stunned,
        stunDuration: e?.meta?.stunDuration
      });
      
      if (!e?.meta?.stunned) {
        console.log(`Stun wore off at tick ${i+1}`);
        break;
      }
    }
  });
});