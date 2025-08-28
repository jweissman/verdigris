import { describe, it, expect, beforeEach } from "bun:test";
import { HeroGame } from "../../src/mwe/hero";

describe("Hero Jump Smoothness", () => {
  let game: HeroGame;

  beforeEach(() => {
    game = new HeroGame();
  });

  it("should move unit position smoothly during jump without discontinuities", () => {
    // Create a hero at position (10, 10)
    game.sim.addUnit({
      id: "hero",
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      tags: ["hero"],
      meta: { controlled: true, facing: "right" },
    });

    // Initiate a jump to the right (distance 6)
    game.sim.queuedCommands.push({
      type: "jump",
      unitId: "hero",
      params: {
        direction: "right",
        distance: 6,
        height: 6,
      },
    });

    // Track positions during jump
    const positions: Array<{ tick: number; x: number; y: number; z: number }> = [];
    
    // Simulate 10 ticks (full jump duration)
    for (let tick = 0; tick < 12; tick++) {
      game.sim.step();
      const hero = game.sim.units.find(u => u.id === "hero");
      if (hero) {
        positions.push({
          tick,
          x: hero.pos.x,
          y: hero.pos.y,
          z: hero.meta?.z || 0,
        });
      }
    }

    // Verify smooth horizontal movement (no big jumps between ticks)
    for (let i = 1; i < positions.length; i++) {
      const deltaX = Math.abs(positions[i].x - positions[i - 1].x);
      
      // During jump (first 10 ticks), movement should be smooth (small increments)
      if (i <= 10 && positions[i - 1].z > 0) {
        // Each tick should move roughly 0.6 units (6 units over 10 ticks)
        expect(deltaX).toBeLessThanOrEqual(1.0);
        expect(deltaX).toBeGreaterThanOrEqual(0.4);
      }
    }

    // Verify parabolic arc for z-height
    const midJump = positions[5];
    expect(midJump.z).toBeGreaterThan(0); // Should be at peak around middle
    
    // Verify start and end positions
    expect(positions[0].x).toBe(10);
    expect(positions[positions.length - 1].x).toBeCloseTo(16, 1); // Should land at target
    expect(positions[positions.length - 1].z).toBe(0); // Should be on ground
  });

  it("should not use renderer interpolation during jump", () => {
    // This test verifies the fix: jumping units should bypass the renderer's interpolation
    game.sim.addUnit({
      id: "jumper",
      pos: { x: 5, y: 5 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      tags: ["hero"],
      meta: { controlled: true, facing: "left" },
    });

    // Start jump
    game.sim.queuedCommands.push({
      type: "jump",
      unitId: "jumper",
      params: {
        direction: "left",
        distance: 4,
        height: 5,
      },
    });

    game.sim.step();
    const jumper = game.sim.units.find(u => u.id === "jumper");
    
    // Unit should be marked as jumping
    expect(jumper?.meta?.jumping).toBe(true);
    
    // Unit should have smooth position values, not interpolation markers
    expect(jumper?.meta?.smoothX).toBeUndefined(); // Shouldn't set smoothX during jump
    expect(jumper?.meta?.smoothY).toBeUndefined(); // Shouldn't set smoothY during jump
    
    // Step one more time to ensure z > 0 (at progress 0, z might be 0)
    game.sim.step();
    const jumper2 = game.sim.units.find(u => u.id === "jumper");
    expect(jumper2?.meta?.z).toBeGreaterThan(0);
  });

  it("should complete jump in exactly 10 ticks", () => {
    game.sim.addUnit({
      id: "timer",
      pos: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      team: "friendly" as const,
      tags: ["hero"],
      meta: { controlled: true },
    });

    game.sim.queuedCommands.push({
      type: "jump",
      unitId: "timer",
      params: {
        direction: "right",
        distance: 5,
        height: 5,
      },
    });

    // Step through jump duration
    for (let i = 0; i < 11; i++) {
      game.sim.step();
      const unit = game.sim.units.find(u => u.id === "timer");
      if (i < 10) {
        expect(unit?.meta?.jumping).toBe(true);
      }
    }

    // After 11 ticks, jump should be complete
    const unit = game.sim.units.find(u => u.id === "timer");
    expect(unit?.meta?.jumping).toBe(false);
    expect(unit?.pos.x).toBeCloseTo(5, 1);
  });
});