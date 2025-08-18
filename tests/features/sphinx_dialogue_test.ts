import { beforeEach, describe, expect, it } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Sphinx Dialogue", () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator();
    sim.fieldWidth = 50;
    sim.fieldHeight = 50;
  });
  
  it("should spawn a sphinx with correct properties", () => {
    const sphinx = sim.addUnit({
      type: "sphinx",
      pos: { x: 25, y: 25 },
    });
    
    expect(sphinx).toBeDefined();
    expect(sphinx.team).toBe("neutral");
    expect(sphinx.hp).toBe(100);
    expect(sphinx.maxHp).toBe(100);
    expect(sphinx.abilities?.length).toBeGreaterThan(0);
  });
  
  it("should allow player to be near sphinx", () => {
    const player = sim.addUnit({
      type: "hero",
      pos: { x: 24, y: 25 },
      team: "friendly",
    });
    
    const sphinx = sim.addUnit({
      type: "sphinx",
      pos: { x: 25, y: 25 },
    });
    
    // Check if units are close enough for interaction (within 1.5 units)
    const dx = sphinx.pos.x - player.pos.x;
    const dy = sphinx.pos.y - player.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    expect(distance).toBeLessThanOrEqual(1.5);
    expect(sphinx.team).toBe("neutral");
  });
  
  it("should have sphinx abilities", () => {
    const sphinx = sim.addUnit({
      type: "sphinx",
      pos: { x: 25, y: 25 },
    });
    
    expect(sphinx.abilities).toBeDefined();
    expect(sphinx.abilities?.includes("riddle")).toBe(true);
    expect(sphinx.abilities?.includes("teleport")).toBe(true);
  });
  
  it("should be noncombatant", () => {
    const sphinx = sim.addUnit({
      type: "sphinx",
      pos: { x: 25, y: 25 },
    });
    
    const enemy = sim.addUnit({
      type: "soldier",
      pos: { x: 26, y: 25 },
      team: "hostile",
    });
    
    // Run a few ticks
    for (let i = 0; i < 5; i++) {
      sim.tick();
    }
    
    // Sphinx should not have taken damage from combat
    expect(sphinx.hp).toBe(100);
  });
});