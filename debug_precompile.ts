import { Simulator } from "./src/core/simulator";

const sim = new Simulator(10, 10);

// Add a unit with abilities
console.log("Adding unit with melee ability...");
sim.addUnit({
  id: "test_unit",
  pos: { x: 5, y: 5 },
  team: "friendly",
  hp: 20,
  abilities: ["melee"]
});

// Check the unit
const units = sim.getTickContext().getAllUnits();
const unit = units[0];

console.log("\nUnit check:");
console.log("- ID:", unit.id);
console.log("- Abilities:", unit.abilities);
console.log("- Has meta?", !!unit.meta);
console.log("- Has compiledTriggers?", !!unit.meta?.compiledTriggers);

if (unit.meta?.compiledTriggers) {
  console.log("- Compiled triggers:", Object.keys(unit.meta.compiledTriggers));
}

// Add enemy unit
sim.addUnit({
  id: "enemy",
  pos: { x: 6, y: 5 },
  team: "hostile",
  hp: 10
});

// Test DSL evaluation
const DSL = require("./src/rules/dsl").default;
const context = sim.getTickContext();
const allUnits = context.getAllUnits();

console.log("\nTesting DSL evaluation for 'distance(closest.enemy()?.pos) <= 2':");
const result = DSL.evaluate("distance(closest.enemy()?.pos) <= 2", unit, context, undefined, allUnits);
console.log("- Result:", result);