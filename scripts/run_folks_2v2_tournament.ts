#!/usr/bin/env bun

/**
 * Run a 2v2 tournament with just folk units
 */

import { Tournament2v2 } from '../src/scenarios/2v2_matches';
import { Folks } from '../src/dmg/folks';

// Run tournament with folk units
const runFolksTournament = (runsPerMatchup: number = 1) => {
  const folkTypes = Folks.names;
  
  console.log(`=== Folks 2v2 Tournament ===`);
  console.log(`Units: ${folkTypes.join(', ')}`);
  console.log(`Total unit types: ${folkTypes.length}`);
  
  // Calculate combinations
  const numTeams = (folkTypes.length * (folkTypes.length + 1)) / 2;
  const numMatchups = numTeams * numTeams;
  console.log(`Possible teams: ${numTeams}`);
  console.log(`Total matchups: ${numMatchups}`);
  console.log(`Runs per matchup: ${runsPerMatchup}`);
  console.log(`Total matches: ${numMatchups * runsPerMatchup}`);
  console.log('');
  
  const startTime = Date.now();
  
  const tournament = new Tournament2v2(folkTypes);
  
  // Progress callback with better stats
  let lastReportTime = Date.now();
  let totalSimTicks = 0;
  let totalSimTime = 0;
  
  const onProgress = (current: number, total: number, stats?: { ticks?: number, simTimeMs?: number }) => {
    const now = Date.now();
    
    if (stats) {
      totalSimTicks += stats.ticks || 0;
      totalSimTime += stats.simTimeMs || 0;
    }
    
    if (now - lastReportTime > 2000) { // Report every 2 seconds
      const percent = ((current / total) * 100).toFixed(1);
      const timeElapsed = (now - startTime) / 1000;
      const timePerMatch = timeElapsed / current;
      const timeRemaining = ((total - current) * timePerMatch);
      const matchesPerSecond = current / timeElapsed;
      
      // Format elapsed time as HH:MM:SS
      const hours = Math.floor(timeElapsed / 3600);
      const minutes = Math.floor((timeElapsed % 3600) / 60);
      const seconds = Math.floor(timeElapsed % 60);
      const elapsedFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Format ETA
      const etaDate = new Date(Date.now() + timeRemaining * 1000);
      const etaFormatted = etaDate.toLocaleTimeString();
      
      // Performance metrics
      let perfStats = "";
      if (totalSimTicks > 0) {
        const avgMsPerTick = totalSimTime / totalSimTicks;
        const simTicksPerSec = totalSimTicks / timeElapsed;
        perfStats = ` | ${avgMsPerTick.toFixed(3)}ms/tick | ${simTicksPerSec.toFixed(0)} ticks/s`;
      }
      
      console.log(`[${elapsedFormatted}] ${current}/${total} (${percent}%)` +
                  ` | ETA: ${etaFormatted}` +
                  ` | ${matchesPerSecond.toFixed(1)} matches/s` +
                  perfStats);
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
  console.log('Usage: bun scripts/run_folks_2v2_tournament.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --runs <n>       Number of runs per matchup (default: 1)');
  console.log('');
  process.exit(0);
}

let runsPerMatchup = 1;

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
  runFolksTournament(runsPerMatchup);
} catch (error) {
  console.error('Error running tournament:', error);
  process.exit(1);
}