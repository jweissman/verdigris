import { Simulator } from './src/core/simulator.js';

const sim = new Simulator(40, 20);

// Test spawning a philosopher directly
const unit = sim.addUnit({
  type: 'philosopher',
  pos: { x: 10, y: 10 }
});

console.log('Created unit:', {
  id: unit.id,
  type: unit.type,
  team: unit.team,
  hp: unit.hp,
  abilities: unit.abilities
});
