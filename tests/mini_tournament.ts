#!/usr/bin/env bun

import { Tournament2v2 } from '../src/scenarios/2v2_matches';
import { Folks } from '../src/dmg/folks';

// Reset cache to pick up ability changes
Folks.resetCache();

// Run mini tournament with just 4 folk types
const folkTypes = ['farmer', 'soldier', 'priest', 'ranger'];

console.log(`=== Mini Folks 2v2 Tournament ===`);
console.log(`Units: ${folkTypes.join(', ')}`);

const tournament = new Tournament2v2(folkTypes);
const results = tournament.runAll(1); // Just 1 run per matchup

console.log('\n=== Results ===');
tournament.printReport();