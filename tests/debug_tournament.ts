#!/usr/bin/env bun

import { Match2v2 } from '../src/scenarios/2v2_matches';
import { Folks } from '../src/dmg/folks';

// Reset cache to pick up ability changes
Folks.resetCache();

// Test a single matchup with debugging
console.log('Testing: farmer+soldier vs priest+ranger');

const match = new Match2v2({
  team1: ['farmer', 'soldier'],
  team2: ['priest', 'ranger'],
  mapSize: 20,
  maxSteps: 100
});

const result = match.run();

console.log('Result:', result);
console.log('Winner:', result.winner);
console.log('Duration:', result.duration, 'steps');
console.log('Survivors:', result.survivors);