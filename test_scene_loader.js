import { Simulator } from './src/core/simulator.js';
import { SceneLoader } from './src/core/scene_loader.js';

const sim = new Simulator(40, 20);
const loader = new SceneLoader(sim);

console.log('Loading scene coastalAgora...');
loader.loadScene('coastalAgora');

console.log('Units after loading:', sim.units.length);
console.log('Friendly units:', sim.units.filter(u => u.team === 'friendly').map(u => u.type));
console.log('Hostile units:', sim.units.filter(u => u.team === 'hostile').map(u => u.type));
