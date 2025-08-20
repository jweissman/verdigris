#!/usr/bin/env bun

import { Tournament2v2 } from '../src/scenarios/2v2_matches';
import { Folks } from '../src/dmg/folks';

// Reset cache to pick up ability changes
Folks.resetCache();

// Run full tournament with all folks
const folkTypes = Folks.names;

console.log(`=== Full Folks 2v2 Tournament ===`);
console.log(`Units (${folkTypes.length}): ${folkTypes.join(', ')}`);
console.log();

const tournament = new Tournament2v2(folkTypes);
const startTime = Date.now();

// Run with progress indicator
const results = tournament.runAll(1, (current, total) => {
  const percent = Math.floor((current / total) * 100);
  if (percent % 10 === 0) {
    console.log(`Progress: ${percent}%`);
  }
});

const elapsed = Date.now() - startTime;
console.log(`\nCompleted in ${(elapsed / 1000).toFixed(1)}s`);

console.log('\n=== Results ===');
tournament.printReport();