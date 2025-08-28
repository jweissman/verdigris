import { Simulator } from './src/core/simulator.js';
import { SceneLoader } from './src/core/scene_loader.js';

const sim = new Simulator(40, 20);
const loader = new SceneLoader(sim);

// Check queued commands before execution
console.log('Loading scene...');
loader.loadScene('coastalAgora');

console.log('\nQueued commands:', sim.queuedCommands?.length || 0);
if (sim.queuedCommands) {
  for (const cmd of sim.queuedCommands) {
    if (cmd.type === 'spawn') {
      console.log(`Spawn: ${cmd.params.unitType} at (${cmd.params.x}, ${cmd.params.y})`);
    }
  }
}

console.log('\nUnits after loading:', sim.units.map(u => ({
  type: u.type,
  team: u.team,
  pos: u.pos
})));
