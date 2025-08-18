import Encyclopaedia from "./src/dmg/encyclopaedia";
import { Simulator } from "./src/core/simulator";

// Test pre-compilation with a real scenario
const sim = new Simulator(50, 50);

// Add units with abilities
sim.addUnit({
  id: "test1",
  type: "soldier",
  pos: { x: 10, y: 10 },
  team: "friendly",
  hp: 30,
  abilities: ["melee", "ranged"]
});

// Get the unit
const units = sim.getTickContext().getAllUnits();
const unit = units[0];

console.log("Unit abilities:", unit.abilities);
console.log("Unit meta:", unit.meta);
console.log("Compiled triggers:", Object.keys(unit.meta?.compiledTriggers || {}));

// Also check ability definitions
const Abilities = require("./src/rules/abilities").Abilities;
console.log("\nMelee trigger:", Abilities.all.melee?.trigger);
console.log("Ranged trigger:", Abilities.all.ranged?.trigger);