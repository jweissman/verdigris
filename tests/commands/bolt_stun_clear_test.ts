import { describe, test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Bolt Stun Clear Debug", () => {
  test("track exact stun clearing", () => {
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
    
    // Cast bolt
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: { x: 10, y: 10 }
    });
    
    sim.step(); // Process bolt
    sim.step(); // Process AOE
    sim.step(); // Process meta
    
    let enemy = sim.units.find(u => u.id === "enemy");
    const initialDuration = enemy?.meta?.stunDuration || 0;
    console.log("Initial stun duration:", initialDuration);
    expect(initialDuration).toBeGreaterThan(0);
    
    // Step exactly the duration
    for (let i = 0; i < initialDuration; i++) {
      sim.step();
      enemy = sim.units.find(u => u.id === "enemy");
      console.log(`After step ${i+1}: stunned=${enemy?.meta?.stunned}, duration=${enemy?.meta?.stunDuration}`);
      
      // Check if it should be cleared
      if (enemy?.meta?.stunDuration === 0) {
        console.log("Duration hit 0, checking next step...");
        sim.step();
        enemy = sim.units.find(u => u.id === "enemy");
        console.log(`After clearing step: stunned=${enemy?.meta?.stunned}, duration=${enemy?.meta?.stunDuration}`);
        break;
      }
    }
    
    expect(enemy?.meta?.stunned).toBeUndefined();
    expect(enemy?.meta?.stunDuration).toBeUndefined();
  });
});