// Debug script to investigate megasquirrel chaining
import { Simulator } from './src/simulator.ts';
import Encyclopaedia from './src/dmg/encyclopaedia.ts';

const sim = new Simulator(20, 20);

// Add 3 megasquirrels in a line
for (let i = 0; i < 3; i++) {
  sim.addUnit({
    ...Encyclopaedia.unit('megasquirrel'),
    id: `mega${i}`,
    pos: { x: 5 + i * 6, y: 5 }
  });
}

console.log('Initial positions:');
sim.getRealUnits().forEach(u => {
  if (u.sprite === 'megasquirrel') {
    console.log(`${u.id}: (${u.pos.x}, ${u.pos.y})`);
  }
});

// Run for a few steps to see if they move together
for (let step = 0; step < 10; step++) {
  sim.step();
  
  console.log(`\nStep ${step + 1}:`);
  sim.getRealUnits().forEach(u => {
    if (u.sprite === 'megasquirrel') {
      console.log(`${u.id}: (${u.pos.x}, ${u.pos.y}) - intended: (${u.intendedMove.x}, ${u.intendedMove.y})`);
    }
  });
}