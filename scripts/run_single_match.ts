#!/usr/bin/env bun

/**
 * CLI interface for running a single 2v2 match
 * Can be invoked by Ruby orchestrator for parallel processing
 */

import { Match2v2 } from '../src/scenarios/2v2_matches';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 4 || args.includes('--help')) {
  console.log('Usage: bun scripts/run_single_match.ts <team1_unit1> <team1_unit2> <team2_unit1> <team2_unit2>');
  console.log('');
  console.log('Example: bun scripts/run_single_match.ts soldier soldier farmer farmer');
  console.log('');
  console.log('Output: JSON result on stdout');
  process.exit(args.includes('--help') ? 0 : 1);
}

const team1: [string, string] = [args[0], args[1]];
const team2: [string, string] = [args[2], args[3]];

try {
  const match = new Match2v2({
    team1: team1,
    team2: team2,
    mapSize: 15,
    maxSteps: 500
  });
  
  const result = match.run();
  
  // Output JSON result for Ruby to parse
  console.log(JSON.stringify({
    winner: result.winner,
    duration: result.duration,
    survivors: result.survivors,
    team1: team1,
    team2: team2
  }));
  
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify({
    error: error.message,
    team1: team1,
    team2: team2
  }));
  process.exit(1);
}