import { describe, test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Bolt Caster Protection", () => {
  test("bolt should not damage or stun the caster at same position", () => {
    const sim = new Simulator(20, 20);
    
    const hero = sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      dmg: 10,
      team: "friendly"
    });
    
    // Hero casts bolt at their own position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: { x: 10, y: 10 }
    });
    
    sim.step(); // Process bolt
    
    sim.step(); // Process damage/stun commands
    
    sim.step(); // Process any remaining effects
    
    expect(hero.hp).toBe(100); // Should not be damaged
    expect(hero.meta?.stunned).toBeUndefined(); // Should not be stunned
  });
});