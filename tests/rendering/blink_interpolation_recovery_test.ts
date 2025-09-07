import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import IsometricView from "../../src/views/isometric";

test("interpolation should resume after blink teleport", () => {
  const sim = new Simulator(50, 30);
  
  // Create mock canvas context
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
  
  // Add a hero
  const hero = sim.addUnit({
    id: "test-hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  // Initialize view tracking
  (view as any).updateMovementInterpolations();
  
  console.log("=== Initial State ===");
  console.log("Hero at:", hero.pos);
  console.log("Previous position tracked:", (view as any).previousPositions.get("test-hero"));
  
  // Simulate blink teleport - need to use transform to actually move the unit
  const transform = sim.getTransform();
  transform.updateUnit("test-hero", {
    pos: { x: 20, y: 10 },
    meta: {
      ...hero.meta,
      teleported: true,
      teleportedAtTick: 1
    }
  });
  sim.ticks = 1;
  
  (view as any).updateMovementInterpolations();
  
  const previousPositions = (view as any).previousPositions;
  const unitInterpolations = (view as any).unitInterpolations;
  
  console.log("\n=== After Blink ===");
  console.log("Hero at:", hero.pos);
  console.log("Has interpolation?", unitInterpolations.has("test-hero"));
  console.log("Previous position updated to:", previousPositions.get("test-hero"));
  
  // Should NOT have interpolation (teleport skips it)
  expect(unitInterpolations.has("test-hero")).toBe(false);
  // Previous position should be updated to teleport destination
  expect(previousPositions.get("test-hero").x).toBe(20);
  
  // Clear teleport flag (simulating ClearTeleportFlag rule)
  transform.updateUnit("test-hero", {
    meta: {
      ...hero.meta,
      // Remove teleported flag but keep teleportedAtTick for history
    }
  });
  delete hero.meta.teleported;
  sim.ticks = 2;
  
  // Now move normally
  transform.updateUnit("test-hero", {
    pos: { x: 22, y: 10 }
  });
  
  (view as any).updateMovementInterpolations();
  
  console.log("\n=== After Normal Movement ===");
  console.log("Hero at:", hero.pos);
  console.log("Has interpolation?", unitInterpolations.has("test-hero"));
  
  // Should NOW have interpolation for normal movement
  expect(unitInterpolations.has("test-hero")).toBe(true);
  
  const interp = unitInterpolations.get("test-hero");
  console.log("Interpolation:", {
    from: `(${interp.startX}, ${interp.startY})`,
    to: `(${interp.targetX}, ${interp.targetY})`,
    progress: interp.progress
  });
  
  // Interpolation should be from teleport destination to new position
  expect(interp.startX).toBe(20);
  expect(interp.targetX).toBe(22);
  
  console.log("✓ Interpolation correctly resumed after blink!");
});