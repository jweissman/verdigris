import { describe, test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Bolt Visual", () => {
  test("bolt unit should exist and persist for its lifetime", () => {
    const sim = new Simulator(20, 20);
    
    // Cast bolt
    sim.queuedCommands.push({
      type: "bolt",
      params: { x: 10, y: 10 }
    });
    
    sim.step(); // Process bolt command
    
    // Check for bolt unit
    let boltUnit = sim.units.find(u => u.id?.startsWith("bolt_"));
    
    sim.step(); // Process spawns
    
    boltUnit = sim.units.find(u => u.id?.startsWith("bolt_"));
    expect(boltUnit).toBeDefined();
    expect(boltUnit?.sprite).toBe("lightning");
    expect(boltUnit?.meta?.tall).toBe(true);
    expect(boltUnit?.meta?.height).toBe(48);
    
    // Verify it persists
    for (let i = 0; i < 5; i++) {
      sim.step();
      boltUnit = sim.units.find(u => u.id?.startsWith("bolt_"));
      if (i < 4) {
        expect(boltUnit).toBeDefined();
      }
    }
  });
});