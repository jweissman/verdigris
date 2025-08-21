import { expect, test, describe } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("JumpCommand", () => {
  test("should jump in facing direction when no target specified", () => {
    const sim = new Simulator(20, 20);
    
    // Add unit facing right
    sim.addUnit({
      id: "jumper",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 10,
      meta: {
        facing: "right"
      }
    });
    
    // Queue jump command without target
    sim.queuedCommands.push({
      type: "jump",
      unitId: "jumper",
      params: {
        distance: 5
      }
    });
    
    // Process commands
    sim.step();
    
    const jumper = sim.units.find(u => u.id === "jumper");
    expect(jumper).toBeDefined();
    expect(jumper?.meta?.jumping).toBe(true);
    expect(jumper?.meta?.jumpTarget).toBeDefined();
    
    // Should jump to the right
    expect(jumper?.meta?.jumpTarget?.x).toBe(15); // 10 + 5
    expect(jumper?.meta?.jumpTarget?.y).toBe(10); // Same y
  });
  
  test("should jump left when facing left", () => {
    const sim = new Simulator(20, 20);
    
    // Add unit facing left
    sim.addUnit({
      id: "jumper",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 10,
      meta: {
        facing: "left"
      }
    });
    
    // Queue jump command without target
    sim.queuedCommands.push({
      type: "jump",
      unitId: "jumper",
      params: {
        distance: 3
      }
    });
    
    // Process commands
    sim.step();
    
    const jumper = sim.units.find(u => u.id === "jumper");
    expect(jumper?.meta?.jumping).toBe(true);
    expect(jumper?.meta?.jumpTarget?.x).toBe(7); // 10 - 3
    expect(jumper?.meta?.jumpTarget?.y).toBe(10);
  });
  
  test("should clamp jump to field bounds", () => {
    const sim = new Simulator(20, 20);
    
    // Add unit near edge
    sim.addUnit({
      id: "jumper",
      pos: { x: 18, y: 10 },
      team: "friendly",
      hp: 10,
      meta: {
        facing: "right"
      }
    });
    
    // Try to jump past edge
    sim.queuedCommands.push({
      type: "jump",
      unitId: "jumper",
      params: {
        distance: 5
      }
    });
    
    sim.step();
    
    const jumper = sim.units.find(u => u.id === "jumper");
    expect(jumper?.meta?.jumping).toBe(true);
    expect(jumper?.meta?.jumpTarget?.x).toBe(19); // Clamped to max
    expect(jumper?.meta?.jumpTarget?.y).toBe(10);
  });
  
  test("should still accept explicit target coordinates", () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: "jumper",
      pos: { x: 10, y: 10 },
      team: "friendly",
      hp: 10,
      meta: {
        facing: "left" // Facing left but will jump to explicit target
      }
    });
    
    // Jump to specific location
    sim.queuedCommands.push({
      type: "jump",
      unitId: "jumper",
      params: {
        targetX: 15,
        targetY: 12
      }
    });
    
    sim.step();
    
    const jumper = sim.units.find(u => u.id === "jumper");
    expect(jumper?.meta?.jumping).toBe(true);
    expect(jumper?.meta?.jumpTarget?.x).toBe(15);
    expect(jumper?.meta?.jumpTarget?.y).toBe(12);
  });
});