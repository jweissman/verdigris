#!/usr/bin/env bun

/**
 * Run a combinatorial 2v2 tournament
 * 
 * This script runs all possible 2v2 matchups between units
 * and reports statistics on win rates and balance.
 */

import { Tournament2v2 } from '../src/scenarios/2v2_matches';
import Encyclopaedia from '../src/dmg/encyclopaedia';

// Get all available unit types from the bestiary
const getAllUnitTypes = (): string[] => {
  const bestiary = Encyclopaedia.bestiary;
  return Object.keys(bestiary).filter(name => {
    const unit = bestiary[name];
    // Filter out units that might not work well in combat tests
    return unit && unit.hp && unit.hp > 0;
  });
};

// Get folk isotypes - creatures with exactly one ability
const getFolkIsotypes = (): string[] => {
  const bestiary = Encyclopaedia.bestiary;
  return Object.keys(bestiary).filter(name => {
    const unit = bestiary[name];
    // Must have exactly one ability to be a folk isotype
    return unit && unit.hp && unit.hp > 0 && 
           unit.abilities && Array.isArray(unit.abilities) && 
           unit.abilities.length === 1;
  });
};

// Run tournament with specified units
const runTournament = (unitTypes: string[], runsPerMatchup: number = 1) => {
  console.log(`=== 2v2 Tournament ===`);
  console.log(`Units: ${unitTypes.join(', ')}`);
  console.log(`Total unit types: ${unitTypes.length}`);
  
  // Calculate combinations
  const numTeams = (unitTypes.length * (unitTypes.length + 1)) / 2;
  const numMatchups = numTeams * numTeams;
  console.log(`Possible teams: ${numTeams}`);
  console.log(`Total matchups: ${numMatchups}`);
  console.log(`Runs per matchup: ${runsPerMatchup}`);
  console.log(`Total matches: ${numMatchups * runsPerMatchup}`);
  console.log('');
  
  const startTime = Date.now();
  
  const tournament = new Tournament2v2(unitTypes);
  
  // Progress callback
  let lastReportTime = Date.now();
  const onProgress = (current: number, total: number) => {
    const now = Date.now();
    if (now - lastReportTime > 1000) { // Report every second
      const percent = ((current / total) * 100).toFixed(1);
      const timeElapsed = (now - startTime) / 1000;
      const timePerMatch = timeElapsed / current;
      const timeRemaining = ((total - current) * timePerMatch);
      const matchesPerSecond = current / timeElapsed;
      
      console.log(`Progress: ${current}/${total} (${percent}%)` +
                  ` - Elapsed: ${timeElapsed.toFixed(0)}s` +
                  ` - Remaining: ${timeRemaining.toFixed(0)}s` +
                  ` - Speed: ${matchesPerSecond.toFixed(1)} matches/sec`);
      lastReportTime = now;
    }
  };
  
  const results = tournament.runAll(runsPerMatchup, onProgress);
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`\nCompleted in ${duration.toFixed(1)} seconds`);
  console.log(`Average time per match: ${((duration * 1000) / (numMatchups * runsPerMatchup)).toFixed(1)}ms`);
  console.log('');
  
  tournament.printReport();
  
  return results;
};

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: bun scripts/run_2v2_tournament.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --units <list>   Comma-separated list of unit types (default: small subset)');
  console.log('  --all            Use all available units from bestiary');
  console.log('  --folks          Use all folk isotypes (single-ability creatures)');
  console.log('  --runs <n>       Number of runs per matchup (default: 1)');
  console.log('  --quick          Quick test with 4 units');
  console.log('');
  console.log('Examples:');
  console.log('  bun scripts/run_2v2_tournament.ts --quick');
  console.log('  bun scripts/run_2v2_tournament.ts --folks');
  console.log('  bun scripts/run_2v2_tournament.ts --units worm,ranger,demon,bombardier');
  console.log('  bun scripts/run_2v2_tournament.ts --all --runs 3');
  process.exit(0);
}

// Determine which units to use
let unitTypes: string[];
let runsPerMatchup = 1;

if (args.includes('--all')) {
  unitTypes = getAllUnitTypes();
  console.log(`Found ${unitTypes.length} unit types in bestiary`);
  
  // For all units, warn about time
  const numTeams = (unitTypes.length * (unitTypes.length + 1)) / 2;
  const numMatchups = numTeams * numTeams;
  console.log(`WARNING: This will run ${numMatchups} matchups!`);
  console.log('Estimated time: ' + (numMatchups * 0.2 / 60).toFixed(1) + ' minutes');
  console.log('');

} else if (args.includes('--folks')) {
  // Use all folk isotypes (single-ability creatures)
  unitTypes = [
    'worm', 'ranger', 'bombardier', 'squirrel', 'megasquirrel',
    'rainmaker', 'demon', 'mimic-worm', 'big-worm', 'desert-megaworm',
    'skirmisher', 'builder', 'fueler', 'mechanic', 'toymaker',
    'freezebot', 'clanker', 'spiker', 'roller', 'zapper',
    'naturist', 'wildmage', 'miner', 'mindmender'
  ];
  console.log(`Using ${unitTypes.length} folk isotypes (single-ability creatures)`);
  
  // Calculate combinations
  const numTeams = (unitTypes.length * (unitTypes.length + 1)) / 2;
  const numMatchups = numTeams * numTeams;
  console.log(`Total matchups: ${numMatchups}`);
  console.log('Estimated time: ' + (numMatchups * 0.2 / 60).toFixed(1) + ' minutes');
  console.log('');
  
} else if (args.includes('--quick')) {
  // Quick test with just 4 units
  unitTypes = ['worm', 'ranger', 'bombardier', 'demon'];
  
} else if (args.includes('--units')) {
  const unitsIndex = args.indexOf('--units');
  if (unitsIndex >= 0 && args[unitsIndex + 1]) {
    unitTypes = args[unitsIndex + 1].split(',').map(s => s.trim());
  } else {
    console.error('Error: --units requires a comma-separated list');
    process.exit(1);
  }
  
} else {
  // Default: folk isotypes (single-ability creatures)
  unitTypes = getFolkIsotypes();
  console.log(`Using ${unitTypes.length} folk isotypes (single-ability creatures)`);
  
  // Calculate combinations
  const numTeams = (unitTypes.length * (unitTypes.length + 1)) / 2;
  const numMatchups = numTeams * numTeams;
  console.log(`Total matchups: ${numMatchups}`);
  console.log('Estimated time: ' + (numMatchups * 0.2 / 60).toFixed(1) + ' minutes');
  console.log('');
}

// Check runs parameter
if (args.includes('--runs')) {
  const runsIndex = args.indexOf('--runs');
  if (runsIndex >= 0 && args[runsIndex + 1]) {
    runsPerMatchup = parseInt(args[runsIndex + 1]);
    if (isNaN(runsPerMatchup) || runsPerMatchup < 1) {
      console.error('Error: --runs must be a positive integer');
      process.exit(1);
    }
  }
}

// Run the tournament
try {
  runTournament(unitTypes, runsPerMatchup);
} catch (error) {
  console.error('Error running tournament:', error);
  process.exit(1);
}