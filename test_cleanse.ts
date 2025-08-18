import { Simulator } from "./src/core/simulator";
import Encyclopaedia from "./src/dmg/encyclopaedia";

const sim = new Simulator();

// Create units similar to the test
const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 5, y: 5 } };
const damagedConstruct = { ...Encyclopaedia.unit('clanker'), pos: { x: 6, y: 5 } };

damagedConstruct.hp = 2;
damagedConstruct.meta.stunned = true;
damagedConstruct.meta.stunDuration = 20;
damagedConstruct.meta.frozen = true;

sim.addUnit(mechanic);
sim.addUnit(damagedConstruct);

console.log("Before repair:");
const construct1 = sim.liveUnits.find(u => u.pos.x === 6 && u.pos.y === 5);
console.log("- stunned:", construct1?.meta?.stunned);
console.log("- frozen:", construct1?.meta?.frozen);

// Force the ability
sim.forceAbility(mechanic.id, 'emergencyRepair', damagedConstruct);
sim.step();
sim.step();
sim.step();

console.log("\nAfter repair:");
const construct2 = sim.liveUnits.find(u => u.pos.x === 6 && u.pos.y === 5);
console.log("- stunned:", construct2?.meta?.stunned);
console.log("- frozen:", construct2?.meta?.frozen);
console.log("- full meta:", construct2?.meta);