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
    
    console.log("Hero before bolt - HP:", hero.hp, "stunned:", hero.meta?.stunned);
    
    // Hero casts bolt at their own position
    sim.queuedCommands.push({
      type: "bolt",
      unitId: "hero",
      params: { x: 10, y: 10 }
    });
    
    sim.step(); // Process bolt
    console.log("After bolt command - HP:", hero.hp, "stunned:", hero.meta?.stunned);
    
    sim.step(); // Process damage/stun commands
    console.log("After damage processing - HP:", hero.hp, "stunned:", hero.meta?.stunned);
    
    sim.step(); // Process any remaining effects
    console.log("After effects - HP:", hero.hp, "stunned:", hero.meta?.stunned);
    
    expect(hero.hp).toBe(100); // Should not be damaged
    expect(hero.meta?.stunned).toBeUndefined(); // Should not be stunned
  });
});