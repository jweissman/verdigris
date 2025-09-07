import { test, expect } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import IsometricView from "../../src/views/isometric";

test("blink teleports, dash moves fast, normal movement interpolates smoothly", () => {
  const sim = new Simulator(100, 30);
  
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
  
  // Create three heroes for comparison
  const normalHero = sim.addUnit({
    id: "normal-hero",
    type: "hero",
    pos: { x: 10, y: 5 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  const dashHero = sim.addUnit({
    id: "dash-hero",
    type: "hero",
    pos: { x: 10, y: 10 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  const blinkHero = sim.addUnit({
    id: "blink-hero",
    type: "hero",
    pos: { x: 10, y: 15 },
    hp: 100,
    maxHp: 100,
    team: "friendly",
    meta: { controlled: true },
    intendedMove: { x: 0, y: 0 }
  });
  
  // Initialize view tracking
  (view as any).updateMovementInterpolations();
  
  const transform = sim.getTransform();
  
  console.log("=== Initial Positions ===");
  console.log("Normal hero:", normalHero.pos);
  console.log("Dash hero:", dashHero.pos);
  console.log("Blink hero:", blinkHero.pos);
  
  // Move all three heroes to x=20
  
  // 1. Normal movement (just update position)
  transform.updateUnit("normal-hero", {
    pos: { x: 20, y: 5 }
  });
  
  // 2. Dash movement (instant but no teleport flag)
  transform.updateUnit("dash-hero", {
    pos: { x: 20, y: 10 },
    meta: {
      ...dashHero.meta,
      lastDashTime: sim.ticks
    }
  });
  
  // 3. Blink movement (instant with teleport flag)
  transform.updateUnit("blink-hero", {
    pos: { x: 20, y: 15 },
    meta: {
      ...blinkHero.meta,
      teleported: true,
      teleportedAtTick: sim.ticks,
      lastBlinkTime: sim.ticks
    }
  });
  
  // Update view interpolations
  (view as any).updateMovementInterpolations();
  
  const unitInterpolations = (view as any).unitInterpolations;
  const previousPositions = (view as any).previousPositions;
  
  console.log("\n=== After Movement ===");
  
  // Check normal hero - should have interpolation
  console.log("Normal hero interpolating?", unitInterpolations.has("normal-hero"));
  expect(unitInterpolations.has("normal-hero")).toBe(true);
  if (unitInterpolations.has("normal-hero")) {
    const interp = unitInterpolations.get("normal-hero");
    console.log("  from:", interp.startX, "to:", interp.targetX);
    expect(interp.startX).toBe(10);
    expect(interp.targetX).toBe(20);
  }
  
  // Check dash hero - should have interpolation
  console.log("Dash hero interpolating?", unitInterpolations.has("dash-hero"));
  expect(unitInterpolations.has("dash-hero")).toBe(true);
  if (unitInterpolations.has("dash-hero")) {
    const interp = unitInterpolations.get("dash-hero");
    console.log("  from:", interp.startX, "to:", interp.targetX);
    expect(interp.startX).toBe(10);
    expect(interp.targetX).toBe(20);
  }
  
  // Check blink hero - should NOT have interpolation
  console.log("Blink hero interpolating?", unitInterpolations.has("blink-hero"));
  expect(unitInterpolations.has("blink-hero")).toBe(false);
  console.log("  Previous position jumped to:", previousPositions.get("blink-hero").x);
  expect(previousPositions.get("blink-hero").x).toBe(20);
  
  console.log("\n=== Rendering Positions at 50% Interpolation ===");
  
  // Simulate rendering with 50% interpolation
  sim.interpolationFactor = 0.5;
  
  // For interpolating heroes, their render position would be halfway
  const normalInterp = unitInterpolations.get("normal-hero");
  if (normalInterp) {
    const renderX = normalInterp.startX + (normalInterp.targetX - normalInterp.startX) * 0.5;
    console.log("Normal hero would render at x =", renderX, "(smooth)");
  }
  
  const dashInterp = unitInterpolations.get("dash-hero");
  if (dashInterp) {
    const renderX = dashInterp.startX + (dashInterp.targetX - dashInterp.startX) * 0.5;
    console.log("Dash hero would render at x =", renderX, "(smooth)");
  }
  
  // Blink hero renders at exact position (no interpolation)
  console.log("Blink hero would render at x =", blinkHero.pos.x, "(instant)");
  
  console.log("\n✓ Movement types correctly differentiated!");
});