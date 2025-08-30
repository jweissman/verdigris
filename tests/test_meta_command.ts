import { test, expect } from "bun:test";
import { Simulator } from "../src/core/simulator";

test("meta command should clear stun", () => {
  const sim = new Simulator(20, 20);
  
  sim.addUnit({
    id: "test",
    pos: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    team: "neutral",
    meta: {
      stunned: true,
      stunDuration: 5
    }
  });
  
  // Queue a meta command to clear stun
  sim.queuedCommands.push({
    type: "meta",
    params: {
      unitId: "test",
      meta: {
        stunned: undefined,
        stunDuration: undefined
      }
    }
  });
  
  sim.step();
  const unit = sim.units.find(u => u.id === "test");
  expect(unit?.meta?.stunned).toBeUndefined();
  expect(unit?.meta?.stunDuration).toBeUndefined();
});