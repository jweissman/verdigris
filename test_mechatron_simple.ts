import { Simulator } from './src/core/simulator';
import { Encyclopaedia } from './src/dmg/encyclopaedia';

const sim = new Simulator(10, 10);

// Add mechatron like the test does
const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 5, y: 5 } };
mechatron.meta.z = 0.4;
mechatron.meta.dropping = true;
mechatron.meta.dropSpeed = 0.5;
mechatron.meta.landingImpact = true;
sim.addUnit(mechatron);

console.log('Added mechatron:', mechatron);

// Find it
const found = sim.units.find(u => u.sprite === 'mechatron');
console.log('Found by sprite:', {
  found: !!found,
  id: found?.id,
  sprite: found?.sprite,
  z: found?.meta?.z,
  dropping: found?.meta?.dropping
});

// Try finding all units
console.log('All units:', sim.units.map(u => ({
  id: u.id,
  sprite: u.sprite,
  z: u.meta?.z
})));

// Step
sim.step();

// Check after step
const afterStep = sim.units.find(u => u.sprite === 'mechatron');
console.log('After step:', {
  found: !!afterStep,
  z: afterStep?.meta?.z,
  dropping: afterStep?.meta?.dropping
});