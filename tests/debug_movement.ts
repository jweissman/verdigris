#!/usr/bin/env bun

import { Simulator } from '../src/core/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';

// Test unit movement and engagement
const sim = new Simulator(20, 20);

// Deploy team 1 at x=2
const farmer = Encyclopaedia.unit('farmer');
const soldier = Encyclopaedia.unit('soldier');

sim.addUnit({
  ...farmer,
  id: 'farmer1',
  team: 'friendly',
  pos: { x: 2, y: 8 }
});

sim.addUnit({
  ...soldier,
  id: 'soldier1',
  team: 'friendly',
  pos: { x: 2, y: 12 }
});

// Deploy team 2 at x=17
const priest = Encyclopaedia.unit('priest');
const ranger = Encyclopaedia.unit('ranger');

sim.addUnit({
  ...priest,
  id: 'priest1',
  team: 'hostile',
  pos: { x: 17, y: 8 }
});

sim.addUnit({
  ...ranger,
  id: 'ranger1',
  team: 'hostile',
  pos: { x: 17, y: 12 }
});

// Run simulation and track positions
console.log('Initial positions:');
sim.units.forEach(u => {
  console.log(`  ${u.id}: (${u.pos.x.toFixed(1)}, ${u.pos.y.toFixed(1)})`);
});

for (let i = 0; i < 20; i++) {
  sim.step();
}

console.log('\nAfter 20 steps:');
sim.units.forEach(u => {
  console.log(`  ${u.id}: (${u.pos.x.toFixed(1)}, ${u.pos.y.toFixed(1)}) state=${u.state} hp=${u.hp}`);
});

for (let i = 0; i < 30; i++) {
  sim.step();
}

console.log('\nAfter 50 steps:');
sim.units.forEach(u => {
  console.log(`  ${u.id}: (${u.pos.x.toFixed(1)}, ${u.pos.y.toFixed(1)}) state=${u.state} hp=${u.hp}`);
});