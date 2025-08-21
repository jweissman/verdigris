import { describe, test, expect } from 'bun:test';
import { Match2v2 } from '../../src/scenarios/2v2_matches';

describe('2v2 Draw Rate Analysis', () => {
  test('measure draw rate for common matchups', () => {
    const matchups = [
      { team1: ['soldier', 'soldier'], team2: ['soldier', 'soldier'] },
      { team1: ['soldier', 'priest'], team2: ['soldier', 'priest'] },
      { team1: ['ranger', 'ranger'], team2: ['ranger', 'ranger'] },
      { team1: ['worm', 'worm'], team2: ['worm', 'worm'] },
      { team1: ['bombardier', 'bombardier'], team2: ['bombardier', 'bombardier'] },
    ];
    
    const results = {
      draws: 0,
      team1Wins: 0,
      team2Wins: 0,
      totalDuration: 0,
      matchDetails: [] as any[]
    };
    
    for (const matchup of matchups) {
      console.log(`Testing: ${matchup.team1.join('+')} vs ${matchup.team2.join('+')}`);
      
      const match = new Match2v2({
        team1: matchup.team1 as [string, string],
        team2: matchup.team2 as [string, string],
        mapSize: 15,
        maxSteps: 500
      });
      
      const result = match.run();
      results.totalDuration += result.duration;
      
      if (result.winner === 'draw') {
        results.draws++;
      } else if (result.winner === 'team1') {
        results.team1Wins++;
      } else {
        results.team2Wins++;
      }
      
      results.matchDetails.push({
        matchup: `${matchup.team1.join('+')} vs ${matchup.team2.join('+')}`,
        winner: result.winner,
        duration: result.duration,
        survivors: result.survivors.length
      });
      
      console.log(`  Result: ${result.winner} in ${result.duration} steps`);
    }
    
    const totalMatches = matchups.length;
    const drawRate = (results.draws / totalMatches) * 100;
    const avgDuration = results.totalDuration / totalMatches;
    
    console.log('\n=== 2v2 Match Statistics ===');
    console.log(`Total matches: ${totalMatches}`);
    console.log(`Draws: ${results.draws} (${drawRate.toFixed(1)}%)`);
    console.log(`Team1 wins: ${results.team1Wins}`);
    console.log(`Team2 wins: ${results.team2Wins}`);
    console.log(`Average duration: ${avgDuration.toFixed(0)} steps`);
    
    // Log matches that resulted in draws
    const drawMatches = results.matchDetails.filter(m => m.winner === 'draw');
    if (drawMatches.length > 0) {
      console.log('\nMatches that ended in draws:');
      drawMatches.forEach(m => {
        console.log(`  ${m.matchup}: ${m.duration} steps`);
      });
    }
    
    // VISION.md states draw rate is a problem - let's check if it's too high
    expect(drawRate).toBeLessThan(50); // Draws should be less than 50%
    expect(avgDuration).toBeLessThan(400); // Matches should resolve reasonably quickly
  });
  
  test('analyze unit damage output', () => {
    const sim = new (require('../../src/core/simulator').Simulator)(15, 15);
    
    const unitTypes = ['soldier', 'ranger', 'bombardier', 'worm', 'priest'];
    const unitStats: Record<string, any> = {};
    
    for (const unitType of unitTypes) {
      const unitData = require('../../src/dmg/encyclopaedia').default.unit(unitType);
      unitStats[unitType] = {
        hp: unitData.hp,
        dmg: unitData.dmg || 0,
        abilities: unitData.abilities || [],
        mass: unitData.mass || 1
      };
      
      console.log(`${unitType}: HP=${unitData.hp}, DMG=${unitData.dmg || 0}, abilities=${(unitData.abilities || []).join(',')}`);
    }
    
    // Check if units have reasonable damage relative to HP
    for (const [unitType, stats] of Object.entries(unitStats)) {
      const hpToDmgRatio = stats.hp / (stats.dmg || 1);
      console.log(`${unitType} HP/DMG ratio: ${hpToDmgRatio.toFixed(1)}`);
      
      // If ratio is too high, combat will be slow
      expect(hpToDmgRatio).toBeLessThan(20); // Units should kill each other in < 20 hits
    }
  });
});