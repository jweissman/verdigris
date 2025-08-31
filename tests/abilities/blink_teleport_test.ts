import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { Unit } from "../../src/types/Unit";

describe("Blink Teleportation", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("should instantly move unit to target position", () => {
    const hero: Partial<Unit> = {
      id: "hero",
      type: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "hero",
      mass: 1,
      meta: { facing: "right" },
    };

    sim.addUnit(hero);

    // Execute blink command
    sim.queuedCommands.push({
      type: "blink",
      unitId: "hero",
      params: {
        distance: 10,
      },
    });

    // Process the blink - should be instant
    sim.step();

    const heroAfter = sim.units.find((u) => u.id === "hero");
    
    // Hero should be at new position immediately
    expect(heroAfter?.pos.x).toBe(20); // Moved 10 tiles right instantly
    expect(heroAfter?.pos.y).toBe(10);
    
    // Hero should have teleported flag for renderer
    expect(heroAfter?.meta?.teleported).toBe(true);
  });

  it("should set position directly, not use intendedMove", () => {
    const hero: Partial<Unit> = {
      id: "hero",
      type: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      abilities: [],
      intendedMove: { x: 0, y: 0 },
      state: "idle",
      sprite: "hero",
      mass: 1,
      meta: {},
    };

    sim.addUnit(hero);

    // Queue blink
    sim.queuedCommands.push({
      type: "blink",
      unitId: "hero",
      params: {
        distance: 8,
      },
    });

    sim.step();

    const heroAfter = sim.units.find((u) => u.id === "hero");
    
    // Position should have changed directly
    expect(heroAfter?.pos.x).toBe(18);
    
    // IntendedMove should be 0 (no gradual movement)
    expect(heroAfter?.intendedMove.x).toBe(0);
    expect(heroAfter?.intendedMove.y).toBe(0);
  });
});