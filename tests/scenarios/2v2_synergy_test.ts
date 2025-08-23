#!/usr/bin/env bun

import { Tournament2v2 } from '../../src/scenarios/2v2_matches';
import { Folks } from '../../src/dmg/folks';

/**
 * 2v2 Synergy Testing
 * 
 * Tests all folk combinations to identify strong synergies
 * and balance issues in 2v2 combat scenarios.
 */


// NOTE: WHAT IS THIS
// Folks.resetCache();
// 
// 
// const allFolks = Folks.names;
// // console.log(`=== 2v2 Synergy Analysis ===`);
// // console.log(`Testing ${allFolks.length} folk types`);
// // console.log(`Total combinations: ${(allFolks.length * (allFolks.length + 1)) / 2}`);
// // console.log();
// 
// 
// const tournament = new Tournament2v2(allFolks);
// 
// // console.log('Running matches...');
// const startTime = Date.now();
// 
// 
// let lastPercent = 0;
// const results = tournament.runAll(3, (current, total) => {
//   const percent = Math.floor((current / total) * 100);
//   if (percent >= lastPercent + 10) {
//     // console.log(`Progress: ${percent}%`);
//     lastPercent = percent;
//   }
// });
// 
// const elapsed = Date.now() - startTime;
// // console.log(`\nCompleted in ${(elapsed / 1000).toFixed(1)}s`);
// 
// 
// // console.log('\n=== Top Synergies ===');
// 
// 
// type TeamStats = {
//   team: string;
//   wins: number;
//   losses: number;
//   draws: number;
//   winRate: number;
//   avgDuration: number;
// };
// 
// const teamStats: Map<string, TeamStats> = new Map();
// 
// for (const [matchup, matchResults] of results) {
//   for (const result of matchResults) {
// 
//     const team1Key = result.team1Units.map(u => u.split('_')[1]).sort().join('+');
//     if (!teamStats.has(team1Key)) {
//       teamStats.set(team1Key, {
//         team: team1Key,
//         wins: 0,
//         losses: 0,
//         draws: 0,
//         winRate: 0,
//         avgDuration: 0
//       });
//     }
//     
// 
//     const team2Key = result.team2Units.map(u => u.split('_')[1]).sort().join('+');
//     if (!teamStats.has(team2Key)) {
//       teamStats.set(team2Key, {
//         team: team2Key,
//         wins: 0,
//         losses: 0,
//         draws: 0,
//         winRate: 0,
//         avgDuration: 0
//       });
//     }
//     
//     const team1Stats = teamStats.get(team1Key)!;
//     const team2Stats = teamStats.get(team2Key)!;
//     
//     if (result.winner === 'team1') {
//       team1Stats.wins++;
//       team2Stats.losses++;
//     } else if (result.winner === 'team2') {
//       team2Stats.wins++;
//       team1Stats.losses++;
//     } else {
//       team1Stats.draws++;
//       team2Stats.draws++;
//     }
//     
//     team1Stats.avgDuration += result.duration;
//     team2Stats.avgDuration += result.duration;
//   }
// }
// 
// 
// for (const stats of teamStats.values()) {
//   const totalGames = stats.wins + stats.losses + stats.draws;
//   if (totalGames > 0) {
//     stats.winRate = stats.wins / totalGames;
//     stats.avgDuration = stats.avgDuration / totalGames;
//   }
// }
// 
// 
// const sortedTeams = Array.from(teamStats.values()).sort((a, b) => b.winRate - a.winRate);
// 
// 
// // console.log('\nTop 10 Team Combinations:');
// // console.log('Team'.padEnd(30) + 'Win%'.padEnd(8) + 'W/L/D'.padEnd(15) + 'Avg Steps');
// // console.log('-'.repeat(65));
// 
// for (let i = 0; i < Math.min(10, sortedTeams.length); i++) {
//   const team = sortedTeams[i];
//   const winPercent = (team.winRate * 100).toFixed(1);
//   const record = `${team.wins}/${team.losses}/${team.draws}`;
//   
//   // console.log(
//     team.team.padEnd(30) +
//     `${winPercent}%`.padEnd(8) +
//     record.padEnd(15) +
//     Math.round(team.avgDuration)
//   );
// }
// 
// 
// // console.log('\nBottom 10 Team Combinations:');
// // console.log('Team'.padEnd(30) + 'Win%'.padEnd(8) + 'W/L/D'.padEnd(15) + 'Avg Steps');
// // console.log('-'.repeat(65));
// 
// for (let i = Math.max(0, sortedTeams.length - 10); i < sortedTeams.length; i++) {
//   const team = sortedTeams[i];
//   const winPercent = (team.winRate * 100).toFixed(1);
//   const record = `${team.wins}/${team.losses}/${team.draws}`;
//   
//   // console.log(
//     team.team.padEnd(30) +
//     `${winPercent}%`.padEnd(8) +
//     record.padEnd(15) +
//     Math.round(team.avgDuration)
//   );
// }
// 
// 
// // console.log('\n=== Synergy Analysis ===');
// 
// 
// const individualWinRates: Map<string, number> = new Map();
// 
// for (const team of sortedTeams) {
//   const units = team.team.split('+');
//   for (const unit of units) {
//     if (!individualWinRates.has(unit)) {
// 
//       let wins = 0, total = 0;
//       for (const t of sortedTeams) {
//         if (t.team.includes(unit)) {
//           wins += t.wins;
//           total += t.wins + t.losses + t.draws;
//         }
//       }
//       individualWinRates.set(unit, total > 0 ? wins / total : 0);
//     }
//   }
// }
// 
// 
// const synergies: Array<{ team: string, synergy: number }> = [];
// 
// for (const team of sortedTeams) {
//   const units = team.team.split('+');
//   if (units.length === 2 && units[0] !== units[1]) {
//     const expected = (individualWinRates.get(units[0])! + individualWinRates.get(units[1])!) / 2;
//     const actual = team.winRate;
//     const synergy = actual - expected;
//     
//     if (Math.abs(synergy) > 0.1) { // Significant synergy
//       synergies.push({ team: team.team, synergy });
//     }
//   }
// }
// 
// synergies.sort((a, b) => b.synergy - a.synergy);
// 
// // console.log('\nTop Positive Synergies:');
// for (let i = 0; i < Math.min(5, synergies.length); i++) {
//   if (synergies[i].synergy > 0) {
//     // console.log(`  ${synergies[i].team}: +${(synergies[i].synergy * 100).toFixed(1)}% synergy`);
//   }
// }
// 
// // console.log('\nTop Negative Synergies (anti-synergies):');
// const antiSynergies = synergies.filter(s => s.synergy < 0).reverse();
// for (let i = 0; i < Math.min(5, antiSynergies.length); i++) {
//   // console.log(`  ${antiSynergies[i].team}: ${(antiSynergies[i].synergy * 100).toFixed(1)}% synergy`);
// }
// 
// 
// const outputFile = 'synergy_results.json';
// const output = {
//   timestamp: new Date().toISOString(),
//   folkCount: allFolks.length,
//   totalMatches: results.size,
//   runtime: elapsed,
//   topTeams: sortedTeams.slice(0, 20),
//   synergies: synergies.slice(0, 20)
// };
// 
// // console.log(`\n📊 Full results saved to ${outputFile}`);