import { test } from "bun:test";
import { Simulator } from "../src/core/simulator";

test("exact stun flow", () => {
  const sim = new Simulator(20, 20);
  
  sim.addUnit({ id: "hero", pos: { x: 5, y: 5 }, hp: 100, maxHp: 100, team: "friendly" });
  sim.addUnit({ id: "enemy", pos: { x: 10, y: 10 }, hp: 100, maxHp: 100, team: "hostile" });
  
  sim.queuedCommands.push({
    type: "bolt",
    unitId: "hero", 
    params: { x: 10, y: 10 }
  });
  
  sim.step(); // Process bolt
  sim.step(); // Process AOE  
  sim.step(); // Process meta
  
  let enemy = sim.units.find(u => u.id === "enemy");
  const initial = enemy?.meta?.stunDuration;
  console.log("Initial duration after application:", initial);
  
  // Count steps needed
  let steps = 0;
  while (enemy?.meta?.stunned) {
    sim.step();
    steps++;
    enemy = sim.units.find(u => u.id === "enemy");
    console.log(`Step ${steps}: stunned=${enemy?.meta?.stunned}, duration=${enemy?.meta?.stunDuration}`);
    if (steps > 25) break;
  }
  
  console.log(`Cleared after ${steps} steps`);
});