import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { Blink } from "../../src/commands/blink";
import { Dash } from "../../src/commands/dash";

test("blink should teleport instantly while dash should move smoothly", () => {
  const sim = new Simulator(50, 30);
  
  // Create two heroes
  const blinkHero = sim.addUnit({
    id: "blink-hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  const dashHero = sim.addUnit({
    id: "dash-hero", 
    type: "hero",
    pos: { x: 10, y: 15 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  // Store initial positions
  sim.lastUnitPositions.set("blink-hero", { x: 10, y: 10, z: 0 } as any);
  sim.lastUnitPositions.set("dash-hero", { x: 10, y: 15, z: 0 } as any);
  
  console.log("=== Initial State ===");
  console.log("Blink hero at:", blinkHero.pos);
  console.log("Dash hero at:", dashHero.pos);
  
  // Execute blink for first hero
  const blinkCmd = new Blink(sim);
  blinkCmd.execute("blink-hero", {
    targetX: 20,
    targetY: 10
  });
  
  // Execute dash for second hero
  const dashCmd = new Dash(sim);
  dashCmd.execute("dash-hero", {
    distance: 10
  });
  
  // Process commands
  sim.tick();
  
  console.log("\n=== After Movement Commands ===");
  console.log("Blink hero at:", blinkHero.pos, "meta:", blinkHero.meta);
  console.log("Dash hero at:", dashHero.pos, "meta:", dashHero.meta);
  
  // Check positions
  expect(blinkHero.pos.x).toBe(20);
  expect(dashHero.pos.x).toBeGreaterThan(10); // Dash should have moved
  
  // Key difference: Check teleport flags
  expect(blinkHero.meta?.teleported).toBe(true);
  expect(blinkHero.meta?.teleportedAtTick).toBe(1);
  
  // Dash should NOT have teleport flags
  expect(dashHero.meta?.teleported).toBeUndefined();
  expect(dashHero.meta?.teleportedAtTick).toBeUndefined();
  
  // Check interpolation behavior
  sim.interpolationFactor = 0.5;
  
  // For blink hero - should skip interpolation
  const blinkLastPos = sim.lastUnitPositions.get("blink-hero");
  expect(blinkLastPos?.x).toBe(20); // Should be at target already
  
  // For dash hero - normal interpolation should work
  const dashLastPos = sim.lastUnitPositions.get("dash-hero");
  // Dash moves instantly but should allow interpolation for next moves
  
  console.log("\n=== Interpolation Check ===");
  console.log("Blink lastPos:", blinkLastPos);
  console.log("Dash lastPos:", dashLastPos);
  
  // The key difference is that blink has teleported flag set,
  // which should be cleared after 1 tick by ClearTeleportFlag rule
});

test("dash should create afterimages and move instantly but allow interpolation", () => {
  const sim = new Simulator(50, 30);
  
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true, facing: "right" },
    intendedMove: { x: 0, y: 0 }
  });
  
  const initialParticles = sim.particles.length;
  
  // Execute dash
  const dashCmd = new Dash(sim);
  dashCmd.execute("hero", {
    distance: 8,
    afterimage: true
  });
  
  sim.tick();
  
  // Check that dash moved the hero
  expect(hero.pos.x).toBe(18); // 10 + 8
  
  // Check afterimages were created (particles)
  expect(sim.particles.length).toBeGreaterThan(initialParticles);
  
  // Check NO teleport flag
  expect(hero.meta?.teleported).toBeUndefined();
  
  console.log("Dash created", sim.particles.length - initialParticles, "afterimage particles");
});