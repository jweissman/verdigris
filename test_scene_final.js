import { Simulator } from './src/core/simulator.js';
import { SceneLoader } from './src/core/scene_loader.js';

const sim = new Simulator(40, 20);
const loader = new SceneLoader(sim);

loader.loadScene('coastalAgora');

const friendlies = sim.units.filter(u => u.team === 'friendly');
const hostiles = sim.units.filter(u => u.team === 'hostile');

console.log('Friendly units:', friendlies.length);
friendlies.forEach(u => console.log(`  - ${u.type}: ${u.abilities}`));

console.log('\nHostile units:', hostiles.length);

// Run a few steps
for (let i = 0; i < 50; i++) {
  sim.step();
}

console.log('\nAfter 50 steps:');
console.log('Particles:', sim.particles.length);
console.log('Remaining friendlies:', sim.units.filter(u => u.team === 'friendly' && u.hp > 0).length);
console.log('Remaining hostiles:', sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length);
