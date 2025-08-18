import { Simulator } from "./src/core/simulator";

const sim = new Simulator(10, 10);

// Add a unit with abilities
sim.addUnit({
  id: "test_unit",
  pos: { x: 5, y: 5 },
  team: "friendly",
  hp: 20,
  abilities: ["melee"]
});

// Get the unit through the proxy (what abilities rule sees)
const context = sim.getTickContext();
const units = context.getAllUnits();
const unit = units[0];

console.log("Unit through proxy:");
console.log("- ID:", unit.id);
console.log("- Abilities:", unit.abilities);
console.log("- Meta:", unit.meta);
console.log("- Meta keys:", Object.keys(unit.meta || {}));
console.log("- Has compiledTriggers?", !!unit.meta?.compiledTriggers);

// Check cold storage directly
const coldData = (sim as any).unitColdData.get(unit.id);
console.log("\nCold storage:");
console.log("- Meta:", coldData?.meta);
console.log("- Meta keys:", Object.keys(coldData?.meta || {}));
console.log("- Has compiledTriggers?", !!coldData?.meta?.compiledTriggers);