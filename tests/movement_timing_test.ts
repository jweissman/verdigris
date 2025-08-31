import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../src/core/simulator";

describe("Movement Timing", () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("move command should actually move the unit in ONE tick", () => {
    const unit = sim.addUnit({
      id: "test",
      type: "soldier",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      intendedMove: { x: 0, y: 0 },
    });

    console.log("Initial:", { pos: unit.pos, intendedMove: unit.intendedMove });
    
    // Queue a simple move command
    sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: "test",
        dx: 1,
        dy: 0,
      },
    });
    
    console.log("After queuing:", { pos: unit.pos, intendedMove: unit.intendedMove });
    
    // Step once
    sim.step();
    
    console.log("After 1 step:", { pos: unit.pos, intendedMove: unit.intendedMove });
    
    // Unit should have moved!
    expect(unit.pos.x).toBe(11);
    expect(unit.pos.y).toBe(10);
  });

  it("hero move command should move in ONE tick", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      intendedMove: { x: 0, y: 0 },
    });

    console.log("Hero initial:", { pos: hero.pos, intendedMove: hero.intendedMove });
    
    // Hero move command
    sim.queuedCommands.push({
      type: "hero",
      params: { action: "down" },
    });
    
    // Step once
    sim.step();
    
    console.log("Hero after 1 step:", { pos: hero.pos, intendedMove: hero.intendedMove });
    
    // Hero should have moved 2 tiles down IN ONE TICK
    expect(hero.pos.x).toBe(20);
    expect(hero.pos.y).toBe(22);
  });

  it("tracing command execution order", () => {
    const unit = sim.addUnit({
      id: "test",
      type: "soldier",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      intendedMove: { x: 0, y: 0 },
    });

    // Add some logging to understand order
    const originalStep = sim.step.bind(sim);
    let commandsProcessed = [];
    let rulesExecuted = [];
    
    sim.step = function() {
      console.log("\n=== STEP START ===");
      console.log("Queued commands:", this.queuedCommands.map(c => c.type));
      
      // Capture what happens
      const result = originalStep.call(this);
      
      console.log("After step - unit pos:", unit.pos);
      console.log("After step - intendedMove:", unit.intendedMove);
      console.log("=== STEP END ===\n");
      
      return result;
    };
    
    // Queue move
    sim.queuedCommands.push({
      type: "move",
      params: {
        unitId: "test",
        dx: 1,
        dy: 0,
      },
    });
    
    sim.step();
  });
});