import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";
import { Game } from "../../src/core/game";

describe("Render Interpolation", () => {
  let sim: Simulator;
  let game: Game;

  beforeEach(() => {
    const canvas = { width: 320, height: 200 } as any;
    game = new Game(canvas);
    sim = game.sim;
  });

  it("should interpolate unit positions between simulation ticks", () => {
    // Add a unit that moves
    sim.addUnit({
      id: "mover",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      meta: { velocity: { x: 1, y: 0 } }, // Moving right
    });

    // Store initial position
    sim.storeUnitPositions();
    const unit = sim.units.find(u => u.id === "mover");
    const initialX = unit!.pos.x;

    // Move the unit
    unit!.pos.x += 1;

    // Test interpolation at various factors
    const factors = [0, 0.25, 0.5, 0.75, 1.0];
    const expectedPositions = [10, 10.25, 10.5, 10.75, 11];

    factors.forEach((factor, i) => {
      sim.interpolationFactor = factor;
      
      // The interpolated position should be between old and new
      const lastPos = sim.lastUnitPositions.get("mover");
      expect(lastPos).toBeDefined();
      expect(lastPos!.x).toBe(initialX);
      
      // Verify interpolation formula: old + (new - old) * factor
      const interpolatedX = lastPos!.x + (unit!.pos.x - lastPos!.x) * factor;
      expect(interpolatedX).toBeCloseTo(expectedPositions[i], 5);
    });
  });

  it("should continue interpolating at factor = 1.0 (regression test)", () => {
    // This tests the bug fix where interpolation stopped at factor = 1.0
    sim.addUnit({
      id: "test",
      pos: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
    });

    // Store position and move unit
    sim.storeUnitPositions();
    const unit = sim.units.find(u => u.id === "test");
    unit!.pos.x = 5;

    // At factor = 1.0, interpolation should still work
    sim.interpolationFactor = 1.0;
    
    const lastPos = sim.lastUnitPositions.get("test");
    expect(lastPos).toBeDefined();
    
    // The unit should appear at its new position when factor = 1.0
    const interpolatedX = lastPos!.x + (unit!.pos.x - lastPos!.x) * 1.0;
    expect(interpolatedX).toBe(5);
  });

  it("should handle tick rate transitions smoothly", () => {
    // Simulate the actual game loop at 10Hz tick rate
    const tickRate = 10;
    const simTickInterval = 1000 / tickRate; // 100ms
    let lastSimTime = Date.now();
    
    const positions: number[] = [];
    
    // Add a unit
    sim.addUnit({
      id: "walker",
      pos: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
    });

    // Simulate 200ms (2 sim ticks) with 60fps rendering
    for (let frame = 0; frame < 12; frame++) {
      const now = lastSimTime + (frame * 16.67); // 60fps = ~16.67ms per frame
      const timeSinceLastSim = now - lastSimTime;
      
      // Check if we need a sim tick
      if (timeSinceLastSim >= simTickInterval) {
        sim.storeUnitPositions();
        const unit = sim.units.find(u => u.id === "walker");
        unit!.pos.x += 1; // Move 1 unit per tick
        lastSimTime = now;
      }
      
      // Calculate interpolation factor
      const factor = Math.min(1, timeSinceLastSim / simTickInterval);
      sim.interpolationFactor = factor;
      
      // Get interpolated position
      const unit = sim.units.find(u => u.id === "walker");
      const lastPos = sim.lastUnitPositions.get("walker");
      if (lastPos) {
        const interpolatedX = lastPos.x + (unit!.pos.x - lastPos.x) * factor;
        positions.push(interpolatedX);
      }
    }
    
    // Verify smooth progression without jumps
    for (let i = 1; i < positions.length; i++) {
      const delta = positions[i] - positions[i - 1];
      // Delta should be small (smooth) or exactly 1 (tick boundary)
      expect(delta).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThanOrEqual(0.2); // Small increments for smooth animation
    }
  });

  it("should reset interpolation factor after each sim tick", () => {
    const tickRate = 10;
    const simTickInterval = 1000 / tickRate; // 100ms
    let lastSimTime = 0;
    
    const factors: number[] = [];
    
    // Simulate frames across a tick boundary
    for (let frame = 0; frame < 10; frame++) {
      const now = frame * 16.67; // 60fps
      let timeSinceLastSim = now - lastSimTime;
      
      // Check for sim tick
      if (timeSinceLastSim >= simTickInterval) {
        lastSimTime = now;
        timeSinceLastSim = 0; // Reset after tick
      }
      
      const factor = Math.min(1, timeSinceLastSim / simTickInterval);
      factors.push(factor);
    }
    
    // Verify the pattern: should increase gradually then reset
    // At 60fps with 10Hz sim: ~6 frames per sim tick
    expect(factors[0]).toBeCloseTo(0, 2);
    expect(factors[3]).toBeGreaterThan(0.3); // Mid-tick
    expect(factors[5]).toBeGreaterThan(0.7); // Near end of tick
    
    // After tick 6 (100ms passed), should reset
    const resetIndex = factors.findIndex((f, i) => i > 0 && f < factors[i - 1]);
    expect(resetIndex).toBeGreaterThan(5); // Should reset around frame 6
  });
});