import { test } from "bun:test";
import { Simulator } from "../src/core/simulator";

test("why does stun get stuck at 1", () => {
  const sim = new Simulator(20, 20);
  
  // Start with duration 2 to see the transition
  sim.addUnit({
    id: "test",
    pos: { x: 0, y: 0 },
    hp: 100,
    maxHp: 100,
    team: "neutral",
    meta: {
      stunned: true,
      stunDuration: 2
    }
  });
  
  console.log("Starting with duration 2");
  
  // Add a listener to see what rules are running
  const originalStep = sim.step.bind(sim);
  sim.step = function() {
    console.log("=== STEP START ===");
    console.log("Simulator queued commands before step:", this.queuedCommands.length);
    const result = originalStep.call(this);
    console.log("Simulator queued commands after step:", this.queuedCommands.length); 
    console.log("=== STEP END ===");
    return result;
  };
  
  for (let i = 0; i < 5; i++) {
    const unit = sim.units.find(u => u.id === "test");
    console.log(`Before step ${i+1}: stunned=${unit?.meta?.stunned}, duration=${unit?.meta?.stunDuration}`);
    
    // Check what commands are queued BEFORE step
    console.log(`  Queued commands before: ${sim.queuedCommands.map(c => `${c.type}(${JSON.stringify(c.params)})`).join(", ")}`);
    
    sim.step();
    
    // Check what commands are queued AFTER step (should be empty if processed)
    console.log(`  Queued commands after: ${sim.queuedCommands.map(c => `${c.type}(${JSON.stringify(c.params)})`).join(", ")}`);
    
    const afterUnit = sim.units.find(u => u.id === "test");
    console.log(`After step ${i+1}: stunned=${afterUnit?.meta?.stunned}, duration=${afterUnit?.meta?.stunDuration}`);
  }
});