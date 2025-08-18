import { Simulator } from "./src/core/simulator";
const DSL = require("./src/rules/dsl").default;

const sim = new Simulator(10, 10);

// Add units
sim.addUnit({
  id: "unit1",
  pos: { x: 5, y: 5 },
  team: "friendly",
  hp: 20,
  abilities: ["melee"]
});

sim.addUnit({
  id: "enemy1",
  pos: { x: 6, y: 5 },
  team: "hostile",
  hp: 20
});

const context = sim.getTickContext();
const allUnits = context.getAllUnits();
const unit = allUnits[0];

const expression = "distance(closest.enemy()?.pos) <= 2";

// Test with pre-compilation
console.log("Testing WITH pre-compilation:");
console.log("Has compiledTriggers?", !!unit.meta?.compiledTriggers);
console.log("Has this expression?", !!unit.meta?.compiledTriggers?.[expression]);

let start = performance.now();
for (let i = 0; i < 10000; i++) {
  DSL.evaluate(expression, unit, context, undefined, allUnits);
}
let elapsed = performance.now() - start;
console.log(`10000 evaluations: ${elapsed.toFixed(2)}ms`);
console.log(`Per evaluation: ${(elapsed / 10000).toFixed(4)}ms`);

// Test WITHOUT pre-compilation (remove it)
console.log("\nTesting WITHOUT pre-compilation:");
delete unit.meta.compiledTriggers;

start = performance.now();
for (let i = 0; i < 10000; i++) {
  DSL.evaluate(expression, unit, context, undefined, allUnits);
}
elapsed = performance.now() - start;
console.log(`10000 evaluations: ${elapsed.toFixed(2)}ms`);
console.log(`Per evaluation: ${(elapsed / 10000).toFixed(4)}ms`);