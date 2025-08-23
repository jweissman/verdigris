import { describe, test, expect } from 'bun:test';
import { Tournament2v2 } from '../../src/scenarios/2v2_matches';

describe.skip('2v2 Tournament Performance', () => {
  test('measure match throughput', () => {
    const units = ['soldier', 'ranger', 'bombardier', 'worm'];
    const tournament = new Tournament2v2(units);
    
    // console.log('\n=== Testing with 4 units ===');
    const numTeams = (4 * 5) / 2; // 10 teams
    const numMatchups = numTeams * numTeams; // 100 matchups
    // console.log(`Teams: ${numTeams}, Matchups: ${numMatchups}`);
    
    const startTime = performance.now();
    let matchCount = 0;
    let stepCount = 0;
    
    // Hook into the shared simulator to count steps
    const sim = (tournament as any).sharedSim;
    const originalStep = sim.step.bind(sim);
    sim.step = function() {
      stepCount++;
      return originalStep();
    };
    
    // Run with progress tracking
    const onProgress = (current: number, total: number) => {
      matchCount = current;
    };
    
    tournament.runAll(1, onProgress);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    const matchesPerSecond = matchCount / totalTime;
    const stepsPerSecond = stepCount / totalTime;
    const avgStepsPerMatch = stepCount / matchCount;
    
    // console.log(`\n=== Performance Results ===`);
    // console.log(`Total time: ${totalTime.toFixed(2)}s`);
    // console.log(`Matches completed: ${matchCount}`);
    // console.log(`Total steps: ${stepCount}`);
    // console.log(`Matches/second: ${matchesPerSecond.toFixed(1)}`);
    // console.log(`Steps/second: ${stepsPerSecond.toFixed(0)}`);
    // console.log(`Avg steps/match: ${avgStepsPerMatch.toFixed(0)}`);
    // console.log(`Avg ms/match: ${(totalTime * 1000 / matchCount).toFixed(1)}ms`);
    // console.log(`Avg ms/step: ${(totalTime * 1000 / stepCount).toFixed(3)}ms`);
    
    // Check performance targets
    expect(matchesPerSecond).toBeGreaterThan(10); // Should handle at least 10 matches/sec
    expect(stepsPerSecond).toBeGreaterThan(1000); // Should handle 1000+ steps/sec
  });
  
  test('profile slow matches', () => {
    const units = ['soldier', 'priest'];
    const tournament = new Tournament2v2(units);
    
    const sim = (tournament as any).sharedSim;
    const slowMatches: any[] = [];
    
    // Track match times
    let currentMatchStart = 0;
    let currentMatchSteps = 0;
    let currentMatchKey = '';
    
    const originalReset = sim.reset.bind(sim);
    sim.reset = function() {
      if (currentMatchStart > 0 && currentMatchSteps > 0) {
        const matchTime = performance.now() - currentMatchStart;
        if (matchTime > 100) { // Matches taking > 100ms
          slowMatches.push({
            match: currentMatchKey,
            time: matchTime,
            steps: currentMatchSteps
          });
        }
      }
      currentMatchStart = performance.now();
      currentMatchSteps = 0;
      return originalReset();
    };
    
    const originalStep = sim.step.bind(sim);
    sim.step = function() {
      currentMatchSteps++;
      return originalStep();
    };
    
    // Run small tournament
    const results = tournament.runAll(1);
    
    if (slowMatches.length > 0) {
      // console.log('\n=== Slow Matches ===');
      slowMatches.sort((a, b) => b.time - a.time);
      slowMatches.slice(0, 5).forEach(m => {
        // console.log(`${m.match}: ${m.time.toFixed(1)}ms (${m.steps} steps)`);
      });
    }
    
    // Check for draws (these are often slow)
    let drawCount = 0;
    for (const [key, matches] of results) {
      for (const match of matches) {
        if (match.winner === 'draw') {
          drawCount++;
          // console.log(`Draw: ${key} after ${match.duration} steps`);
        }
      }
    }
    
    // console.log(`\nTotal draws: ${drawCount}/${results.size}`);
  });
});