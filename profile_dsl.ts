import { Simulator } from "./src/core/simulator";
import DSL from "./src/rules/dsl";

// Create a test scenario with units that have abilities
const sim = new Simulator(50, 50);

// Add units with various abilities to trigger DSL evaluations
for (let i = 0; i < 20; i++) {
  sim.addUnit({
    id: `soldier_${i}`,
    type: "soldier",
    pos: { x: Math.random() * 50, y: Math.random() * 50 },
    team: i % 2 === 0 ? "friendly" : "hostile",
    hp: 20,
    abilities: ["melee", "ranged"]
  });
}

// Add some units with more complex abilities
for (let i = 0; i < 10; i++) {
  sim.addUnit({
    id: `mage_${i}`,
    type: "priest",
    pos: { x: Math.random() * 50, y: Math.random() * 50 },
    team: i % 2 === 0 ? "friendly" : "hostile",
    hp: 15,
    abilities: ["heal", "fireBlast"]
  });
}

// Clear any existing profile data
DSL.clearProfile();

// Run simulation for several ticks to gather data
console.log("Running simulation to profile DSL expressions...");
for (let i = 0; i < 10; i++) {
  sim.step();
}

// Get and display profiling results
const profile = DSL.getProfile();

console.log("\n=== DSL Expression Profile ===");
console.log("Top 20 expressions by total time:\n");

const top20 = profile.slice(0, 20);
for (const entry of top20) {
  console.log(`Expression: "${entry.expression.substring(0, 60)}${entry.expression.length > 60 ? '...' : ''}"`);
  console.log(`  Count: ${entry.count}`);
  console.log(`  Total: ${entry.totalTime.toFixed(4)}ms`);
  console.log(`  Avg:   ${entry.avgTime.toFixed(4)}ms`);
  console.log();
}

// Summary statistics
const totalTime = profile.reduce((sum, e) => sum + e.totalTime, 0);
const totalCount = profile.reduce((sum, e) => sum + e.count, 0);

console.log("=== Summary ===");
console.log(`Total expressions evaluated: ${profile.length}`);
console.log(`Total evaluation count: ${totalCount}`);
console.log(`Total time in DSL.evaluate: ${totalTime.toFixed(4)}ms`);
console.log(`Average time per evaluation: ${(totalTime / totalCount).toFixed(4)}ms`);

// Check which expressions are using eval vs fast paths
const evalExpressions = profile.filter(e => 
  !e.expression.startsWith("distance(closest.enemy()") &&
  !e.expression.startsWith("self.hp") &&
  !e.expression.includes("closest.ally() != null") &&
  !e.expression.includes("closest.enemy() != null")
);

console.log(`\nExpressions using eval (slow path): ${evalExpressions.length}`);
if (evalExpressions.length > 0) {
  console.log("Top eval expressions:");
  for (const entry of evalExpressions.slice(0, 5)) {
    console.log(`  "${entry.expression.substring(0, 50)}..." - ${entry.avgTime.toFixed(4)}ms avg`);
  }
}