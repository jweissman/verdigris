import { Simulator } from './src/core/simulator';

const sim = new Simulator(10, 10);

// Add a dropping unit
const unit = {
  id: 'test_drop',
  pos: { x: 5, y: 5 },
  meta: {
    dropping: true,
    z: 0.4,
    dropSpeed: 0.5,
    landingImpact: true
  },
  hp: 100,
  team: 'friendly' as const
};

sim.addUnit(unit);

// Check initial state
const addedUnit = sim.units.find(u => u.id === 'test_drop');
console.log('Initial unit:', {
  id: addedUnit?.id,
  z: addedUnit?.meta?.z,
  dropping: addedUnit?.meta?.dropping,
  dropSpeed: addedUnit?.meta?.dropSpeed
});

// Step the simulation
sim.step();

// Check after step
const afterUnit = sim.units.find(u => u.id === 'test_drop');
console.log('After step:', {
  id: afterUnit?.id,
  z: afterUnit?.meta?.z,
  dropping: afterUnit?.meta?.dropping
});

if (afterUnit?.meta?.z === 0.4) {
  console.log('ERROR: Z position did not change!');
} else {
  console.log('SUCCESS: Z position changed');
}