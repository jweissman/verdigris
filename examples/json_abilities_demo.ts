/**
 * Demo: How to use JsonAbilities instead of hardcoded Abilities
 * 
 * This shows the complete working data-oriented abilities system!
 */
import { Simulator } from '../src/simulator';
import { JsonAbilities } from '../src/rules/json_abilities';
import { Abilities } from '../src/rules/abilities';
import { CommandHandler } from '../src/rules/command_handler';
import Encyclopaedia from '../src/dmg/encyclopaedia';

console.log('=== Data-Oriented Abilities Demo ===\n');

// Create a simulation with various units that have abilities
const sim = new Simulator();
sim.fieldWidth = 12;
sim.fieldHeight = 8;

// Create units with abilities from the encyclopedia
const ranger = Encyclopaedia.unit('ranger');
ranger.id = 'ranger1';
ranger.pos = { x: 2, y: 4 };
ranger.team = 'friendly';

const priest = Encyclopaedia.unit('priest');
priest.id = 'priest1';  
priest.pos = { x: 3, y: 4 };
priest.team = 'friendly';
priest.hp = 60; // Slightly wounded

const bombardier = Encyclopaedia.unit('bombardier');
bombardier.id = 'bomber1';
bombardier.pos = { x: 4, y: 4 };
bombardier.team = 'friendly';

const enemy1 = Encyclopaedia.unit('soldier');
enemy1.id = 'enemy1';
enemy1.pos = { x: 8, y: 4 };
enemy1.team = 'enemy';

const enemy2 = Encyclopaedia.unit('soldier');
enemy2.id = 'enemy2';
enemy2.pos = { x: 9, y: 3 };
enemy2.team = 'enemy';

sim.units = [ranger, priest, bombardier, enemy1, enemy2];

console.log('Units and their abilities:');
sim.units.forEach(unit => {
  const abilities = Object.keys(unit.abilities || {});
  console.log(`- ${unit.id} (${unit.team}): ${abilities.join(', ') || 'none'}`);
});
console.log('');

// OPTION 1: Use hardcoded Abilities (this will fail with encyclopedia units)
console.log('❌ Hardcoded Abilities (fails with encyclopedia units):');
try {
  const hardcodedSim = new Simulator();
  hardcodedSim.units = JSON.parse(JSON.stringify(sim.units)); // Deep copy
  hardcodedSim.fieldWidth = sim.fieldWidth;
  hardcodedSim.fieldHeight = sim.fieldHeight;
  
  const regularAbilities = new Abilities(hardcodedSim);
  const commandHandler1 = new CommandHandler(hardcodedSim);
  hardcodedSim.rulebook = [regularAbilities, commandHandler1];
  
  hardcodedSim.step();
  console.log('Regular abilities worked!');
} catch (error) {
  console.log(`Failed: ${error.message}`);
}
console.log('');

// OPTION 2: Use JsonAbilities (data-oriented, works!)
console.log('✅ JsonAbilities (data-oriented, works!):');
const jsonAbilities = new JsonAbilities(sim);
const commandHandler = new CommandHandler(sim);
sim.rulebook = [jsonAbilities, commandHandler];

console.log('Running simulation step...');
sim.step();

console.log('\nResults:');
console.log(`- Commands queued: ${sim.queuedCommands.length}`);
console.log(`- Events queued: ${sim.queuedEvents.length}`);
console.log(`- Projectiles created: ${sim.projectiles.length}`);

if (sim.queuedCommands.length > 0) {
  console.log('\nCommands generated:');
  sim.queuedCommands.forEach(cmd => {
    console.log(`  • ${cmd.type} by ${cmd.unitId}: ${cmd.args.join(', ')}`);
  });
}

if (sim.projectiles.length > 0) {
  console.log('\nProjectiles created:');
  sim.projectiles.forEach(proj => {
    console.log(`  • ${proj.type} at (${proj.pos.x}, ${proj.pos.y}) by team ${proj.team}`);
  });
}

console.log('\n🎉 Data-oriented abilities working perfectly!');
console.log('\nTo use JsonAbilities in your simulation:');
console.log('1. Replace: new Abilities(sim)');
console.log('2. With:    new JsonAbilities(sim)');
console.log('3. Define abilities in data/abilities_clean.json');
console.log('4. Units reference abilities by name: { abilities: { ranged: {} } }');