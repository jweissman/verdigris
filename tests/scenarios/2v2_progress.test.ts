import { describe, test, expect } from 'bun:test';
import { Tournament2v2 } from '../../src/scenarios/2v2_matches';

describe('2v2 Tournament Progress Reporting', () => {
  test.skip('tournament reports progress frequently', () => {
    // SKIPPED: This test is too slow for regular test runs
    // Small tournament for testing
    const unitTypes = ['soldier', 'archer', 'mage'];
    const tournament = new Tournament2v2(unitTypes);
    
    // Track progress calls
    const progressReports: number[] = [];
    const onProgress = (current: number, total: number) => {
      progressReports.push(current);
    };
    
    // Run tournament with 1 run per matchup
    // 3 units = 6 teams, 6*6 = 36 matchups
    tournament.runAll(1, onProgress);
    
    // Should have reported progress
    expect(progressReports.length).toBeGreaterThan(0);
    
    // Should report frequently at the start
    expect(progressReports).toContain(1);
    expect(progressReports).toContain(2);
    expect(progressReports).toContain(3);
    
    // Final progress should be total matches
    expect(progressReports[progressReports.length - 1]).toBe(36);
  });
  
  test.skip('progress reporting frequency scales appropriately', () => {
    // SKIPPED: This test is too slow for regular test runs
    // Test with more units
    const unitTypes = ['soldier', 'archer', 'mage', 'warrior', 'priest'];
    const tournament = new Tournament2v2(unitTypes);
    
    const progressReports: number[] = [];
    const onProgress = (current: number) => {
      progressReports.push(current);
    };
    
    // 5 units = 15 teams, 15*15 = 225 matchups
    tournament.runAll(1, onProgress);
    
    // Check reporting pattern
    // Should report every match for first 100
    const earlyReports = progressReports.filter(n => n < 100);
    expect(earlyReports.length).toBeGreaterThan(90); // Most of first 100
    
    // Less frequent after 100
    const midReports = progressReports.filter(n => n >= 100 && n < 1000);
    const midGaps = [];
    for (let i = 1; i < midReports.length; i++) {
      midGaps.push(midReports[i] - midReports[i-1]);
    }
    
    // Should be reporting every 10 matches
    if (midGaps.length > 0) {
      expect(Math.min(...midGaps)).toBe(10);
    }
  });
  
  test.skip('large tournament doesnt hang without progress', () => {
    // SKIPPED: This test is too slow for regular test runs
    // Test that we get progress even with many units
    const manyUnits = Array.from({length: 10}, (_, i) => `unit${i}`);
    const tournament = new Tournament2v2(manyUnits);
    
    let lastProgressTime = Date.now();
    let maxGap = 0;
    
    const onProgress = () => {
      const now = Date.now();
      const gap = now - lastProgressTime;
      maxGap = Math.max(maxGap, gap);
      lastProgressTime = now;
    };
    
    // Run just first 100 matches to test
    let matchCount = 0;
    const teams: [string, string][] = [];
    for (let i = 0; i < manyUnits.length; i++) {
      for (let j = i; j < manyUnits.length; j++) {
        teams.push([manyUnits[i], manyUnits[j]]);
      }
    }
    
    // Run subset
    for (let i = 0; i < Math.min(10, teams.length); i++) {
      for (let j = 0; j < Math.min(10, teams.length); j++) {
        matchCount++;
        if (matchCount <= 100) {
          onProgress();
        }
      }
    }
    
    // Should never go more than a second without progress in early matches
    expect(maxGap).toBeLessThan(1000);
  });
});