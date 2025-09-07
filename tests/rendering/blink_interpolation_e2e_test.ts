import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import IsometricView from "../../src/views/isometric";
import { Blink } from "../../src/commands/blink";

test("e2e: blink should not permanently break interpolation", () => {
  const sim = new Simulator(100, 30);
  
  // Mock canvas
  const ctx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    fillRect: () => {},
    drawImage: () => {},
    clearRect: () => {},
    fillText: () => {},
    strokeText: () => {},
    measureText: () => ({ width: 10 }),
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillStyle: "",
    globalAlpha: 1,
    canvas: { width: 800, height: 600 },
  } as any;
  
  const view = new IsometricView(ctx, sim, 800, 600, new Map(), new Map());
  
  // Add a hero like in the actual game
  const hero = sim.addUnit({
    id: "hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    dmg: 15,
    meta: {
      controlled: true,
      facing: "right"
    },
    abilities: ["blink"],
    intendedMove: { x: 0, y: 0 }
  });
  
  console.log("=== Initial State ===");
  console.log("Hero at:", hero.pos);
  
  // Initialize view tracking first
  (view as any).updateMovementInterpolations();
  console.log("Initial previousPositions:", (view as any).previousPositions.get("hero"));
  
  // Simulate several frames of normal movement first
  console.log("\n=== Normal Movement Phase ===");
  const transform = sim.getTransform();
  
  for (let i = 0; i < 3; i++) {
    const prevX = hero.pos.x;
    
    // Move hero right
    transform.updateUnit("hero", {
      intendedMove: { x: 1, y: 0 }
    });
    sim.tick();
    
    const newX = hero.pos.x;
    console.log(`\nFrame ${i + 1}: Hero moved from ${prevX} to ${newX}`);
    
    // Check state before view update
    const prevPos = (view as any).previousPositions.get("hero");
    console.log("Previous position before view update:", prevPos);
    
    // Update view (this happens every frame in the game)
    (view as any).updateMovementInterpolations();
    
    const interp = (view as any).unitInterpolations.get("hero");
    const newPrevPos = (view as any).previousPositions.get("hero");
    
    console.log("Previous position after view update:", newPrevPos);
    console.log(`Has interpolation: ${!!interp}`);
    
    if (interp) {
      console.log(`Interpolating from ${interp.startX} to ${interp.targetX}`);
    }
    
    // Should have interpolation during normal movement (after first frame)
    if (i > 0 || prevX !== newX) {
      expect((view as any).unitInterpolations.has("hero")).toBe(true);
    }
  }
  
  // Reset intended move
  transform.updateUnit("hero", {
    intendedMove: { x: 0, y: 0 }
  });
  
  console.log("\n=== Blink Phase ===");
  const posBeforeBlink = { ...hero.pos };
  console.log("Position before blink:", posBeforeBlink);
  
  // Execute blink command  
  const blinkCmd = new Blink(sim);
  blinkCmd.execute("hero", {
    targetX: 23,
    targetY: 10
  });
  
  // Process the blink
  sim.tick();
  (view as any).updateMovementInterpolations();
  
  console.log("Position after blink:", hero.pos);
  console.log("Hero meta:", hero.meta);
  console.log("Has interpolation?", (view as any).unitInterpolations.has("hero"));
  console.log("Previous position stored:", (view as any).previousPositions.get("hero"));
  
  // Should NOT interpolate the blink itself
  expect((view as any).unitInterpolations.has("hero")).toBe(false);
  expect(hero.pos.x).toBe(23);
  
  // Simulate several more ticks (including rule processing)
  console.log("\n=== After Blink - Testing Recovery ===");
  for (let tick = 0; tick < 5; tick++) {
    console.log(`\n--- Tick ${tick + 1} after blink ---`);
    console.log("Hero teleported flag:", hero.meta?.teleported);
    console.log("Hero teleportedAtTick:", hero.meta?.teleportedAtTick);
    
    // Move hero normally
    transform.updateUnit("hero", {
      intendedMove: { x: 1, y: 0 }
    });
    
    // Tick processes rules, including ClearTeleportFlag
    sim.tick();
    
    console.log("After tick - Hero at:", hero.pos);
    console.log("After tick - teleported flag:", hero.meta?.teleported);
    
    // Update view interpolations
    (view as any).updateMovementInterpolations();
    
    const hasInterp = (view as any).unitInterpolations.has("hero");
    const prevPos = (view as any).previousPositions.get("hero");
    
    console.log("Has interpolation?", hasInterp);
    console.log("Previous position:", prevPos);
    
    if (hasInterp) {
      const interp = (view as any).unitInterpolations.get("hero");
      console.log("Interpolating from", interp.startX, "to", interp.targetX);
    }
    
    // After the first tick, teleported flag should be cleared and interpolation should resume
    if (tick > 0) {
      expect(hasInterp).toBe(true);
    }
  }
  
  console.log("\n=== Final Check ===");
  const finalHasInterp = (view as any).unitInterpolations.has("hero");
  console.log("Final interpolation status:", finalHasInterp);
  
  // MUST have interpolation after blink + normal movement
  expect(finalHasInterp).toBe(true);
});