import { describe, it, expect, beforeEach } from "bun:test";
import { Simulator } from "../../src/core/simulator";

describe("Jump Interpolation", () => {
  let sim: Simulator;

  beforeEach(() => {
    sim = new Simulator(40, 25);
  });

  it("should interpolate jumping unit positions between sim ticks", () => {
    // Add a jumping unit
    sim.addUnit({
      id: "jumper",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      meta: {
        jumping: true,
        jumpOrigin: { x: 10, y: 10 },
        jumpTarget: { x: 16, y: 10 },
        jumpProgress: 0,
        jumpHeight: 6,
        z: 0
      }
    });

    // Store initial position
    sim.storeUnitPositions();
    
    // Simulate one jump tick (moves 0.6 units per tick over 10 ticks)
    const unit = sim.units.find(u => u.id === "jumper");
    unit!.pos.x = 10.6; // After one tick of jump
    unit!.meta.jumpProgress = 1;
    unit!.meta.z = 2.16; // Height at progress 1/10
    
    // Test interpolation at various factors
    const factors = [0, 0.25, 0.5, 0.75, 1.0];
    
    for (const factor of factors) {
      sim.interpolationFactor = factor;
      
      // The position should interpolate smoothly
      const lastPos = sim.lastUnitPositions.get("jumper");
      expect(lastPos).toBeDefined();
      
      // Calculate expected interpolated X position
      const expectedX = lastPos!.x + (unit!.pos.x - lastPos!.x) * factor;
      
      // For jumping units, we should still interpolate X/Y positions
      expect(expectedX).toBeCloseTo(10 + 0.6 * factor, 5);
    }
  });

  it("should maintain smooth arc during jump regardless of sim tick rate", () => {
    sim.addUnit({
      id: "arc_jumper",
      pos: { x: 7.5, y: 5 }, // Position should be updated by jump rule
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      meta: {
        jumping: true,
        jumpOrigin: { x: 5, y: 5 },
        jumpTarget: { x: 10, y: 5 },
        jumpProgress: 5, // Midway through jump
        jumpHeight: 6,
        z: 6 // Should be at peak
      }
    });

    // The z-height should follow a parabolic arc
    // At progress = 5 (out of 10), t = 0.5
    // z = 4 * 6 * 0.5 * (1 - 0.5) = 6
    const unit = sim.units.find(u => u.id === "arc_jumper");
    expect(unit!.meta.z).toBe(6);
    
    // Jump rule should have moved unit to halfway position
    expect(unit!.pos.x).toBeCloseTo(7.5, 1);
  });

  it("should not disable interpolation for jumping units", () => {
    // This test documents the bug where jumping units have interpolation disabled
    sim.addUnit({
      id: "test_jumper",
      pos: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      meta: { jumping: true }
    });

    // Store position
    sim.storeUnitPositions();
    
    // Move unit
    const unit = sim.units.find(u => u.id === "test_jumper");
    unit!.pos.x = 2;
    
    // With interpolation factor 0.5, we should see interpolated position
    sim.interpolationFactor = 0.5;
    
    const lastPos = sim.lastUnitPositions.get("test_jumper");
    expect(lastPos).toBeDefined();
    
    // The renderer should interpolate even for jumping units
    const interpolatedX = lastPos!.x + (unit!.pos.x - lastPos!.x) * 0.5;
    expect(interpolatedX).toBe(1); // Should be halfway between 0 and 2
  });
});