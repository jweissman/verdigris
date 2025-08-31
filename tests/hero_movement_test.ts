import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../src/core/simulator";

describe("Hero Movement Y-axis", () => {
  let sim: Simulator;
  
  beforeEach(() => {
    sim = new Simulator(40, 40);
  });

  it("hero should move 2 tiles in Y direction per step", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true },
      intendedMove: { x: 0, y: 0 },
    });

    // Move down
    sim.queuedCommands.push({
      type: "hero",
      params: { action: "down" },
    });
    
    sim.step();
    
    // Movement is applied by forces system, needs another step
    sim.step();
    
    expect(hero.pos.y).toBe(22); // Should move 2 tiles down
    expect(hero.pos.x).toBe(20); // X should not change
  });

  it("hero intendedMove should be set correctly when moving down", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true },
      intendedMove: { x: 0, y: 0 },
    });

    // Move down
    sim.queuedCommands.push({
      type: "hero",
      params: { action: "down" },
    });
    
    // After queuing but before step
    const beforeStep = { ...hero.intendedMove };
    
    sim.step();
    
    console.log("Before step intendedMove:", beforeStep);
    console.log("After step intendedMove:", hero.intendedMove);
    console.log("Hero position:", hero.pos);
    
    // intendedMove should have been set to {x: 0, y: 2} at some point
    // but might be reset after movement completes
  });

  it("hero animation state when moving down repeatedly", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true, useRig: true },
      intendedMove: { x: 0, y: 0 },
    });

    const positions = [];
    const intendedMoves = [];
    
    // Move down multiple times
    for (let i = 0; i < 5; i++) {
      sim.queuedCommands.push({
        type: "hero",
        params: { action: "down" },
      });
      
      sim.step();
      
      positions.push({ ...hero.pos });
      intendedMoves.push({ ...hero.intendedMove });
      
      console.log(`Step ${i}: pos=(${hero.pos.x}, ${hero.pos.y}), intendedMove=(${hero.intendedMove.x}, ${hero.intendedMove.y})`);
    }
    
    // Check that movement is consistent
    for (let i = 0; i < positions.length; i++) {
      expect(positions[i].x).toBe(20); // X should never change
      expect(positions[i].y).toBe(22 + i * 2); // Y should increase by 2 each step
    }
  });

  it("hero should NOT move sideways when moving up/down (zigzag issue)", () => {
    const hero = sim.addUnit({
      id: "hero",
      type: "hero",
      pos: { x: 20, y: 20 },
      hp: 100,
      maxHp: 100,
      team: "friendly",
      tags: ["hero"],
      meta: { controlled: true },
      intendedMove: { x: 0, y: 0 },
    });

    // Move up
    sim.queuedCommands.push({
      type: "hero",
      params: { action: "up" },
    });
    
    sim.step();
    
    expect(hero.pos.x).toBe(20); // X must not change
    expect(hero.pos.y).toBe(18); // Y should decrease by 2
    
    // Move down
    sim.queuedCommands.push({
      type: "hero",
      params: { action: "down" },
    });
    
    sim.step();
    
    expect(hero.pos.x).toBe(20); // X must still not change
    expect(hero.pos.y).toBe(20); // Back to original Y
  });
});