#!/usr/bin/env bun

import { Simulator } from '../src/core/simulator';
import { Folks } from '../src/dmg/folks';

// Quick 2v2 test
const sim = new Simulator(30, 30);

// Team 1: farmer + soldier
const farmer = Folks.get('farmer')!;
const soldier = Folks.get('soldier')!;

// Team 2: priest + ranger  
const priest = Folks.get('priest')!;
const ranger = Folks.get('ranger')!;

// Place team 1 (left side)
const f1 = { ...farmer, id: 'farmer1', team: 'friendly', pos: { x: 10, y: 14 } };
const s1 = { ...soldier, id: 'soldier1', team: 'friendly', pos: { x: 10, y: 16 } };
console.log('Adding farmer with team:', f1.team);
sim.addUnit(f1);
sim.addUnit(s1);

// Place team 2 (right side, closer)
const p1 = { ...priest, id: 'priest1', team: 'hostile', pos: { x: 20, y: 14 } };
const r1 = { ...ranger, id: 'ranger1', team: 'hostile', pos: { x: 20, y: 16 } };
sim.addUnit(p1);
sim.addUnit(r1);

console.log('Starting quick 2v2: farmer+soldier vs priest+ranger');

// Debug initial state
console.log('Initial units:', sim.units.map(u => `${u.id}:${u.team}`));

// Run for 100 steps
for (let i = 0; i < 100; i++) {
  sim.step();
  
  const units = sim.units;
  const friendlyAlive = units.filter(u => u.team === 'friendly' && u.state !== 'dead').length;
  const hostileAlive = units.filter(u => u.team === 'hostile' && u.state !== 'dead').length;
  
  // Print status every 20 steps
  if (i % 20 === 0) {
    console.log(`Step ${i}: Friendly=${friendlyAlive}, Hostile=${hostileAlive}`);
    for (const u of units) {
      console.log(`  ${u.id}: hp=${u.hp} pos=(${Math.round(u.pos.x)},${Math.round(u.pos.y)})`);
    }
  }
  
  if (friendlyAlive === 0) {
    console.log(`Hostile wins at step ${i}!`);
    break;
  }
  if (hostileAlive === 0) {
    console.log(`Friendly wins at step ${i}!`);
    break;
  }
}

const units = sim.units;
console.log('\nFinal state:');
for (const unit of units) {
  console.log(`${unit.id}: ${unit.hp}/${unit.maxHp} HP (${unit.state})`);
}