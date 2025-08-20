import { describe, expect, it } from 'bun:test';
import { Match2v2, Tournament2v2 } from '../../src/scenarios/2v2_matches';

// NOTE: This doesn't really make sense (these creatures don't all really exist; the goal is a _combinatorial_ test of all 30+ creatures, ie 30c4 or 50k+ matches..)
describe('2v2 Match System', () => {
  it('should run a simple 2v2 match', () => {
    const match = new Match2v2({
      team1: ['soldier', 'archer'],
      team2: ['soldier', 'archer'],
      mapSize: 20,
      maxSteps: 100
    });
    
    const result = match.run();
    
    expect(result).toBeDefined();
    expect(['team1', 'team2', 'draw']).toContain(result.winner);
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThanOrEqual(100);
  });
  
  it('should handle asymmetric matchups', () => {
    const match = new Match2v2({
      team1: ['warrior', 'warrior'],
      team2: ['archer', 'archer'],
      mapSize: 20,
      maxSteps: 200
    });
    
    const result = match.run();
    
    expect(result).toBeDefined();
    expect(result.team1Units).toHaveLength(2);
    expect(result.team2Units).toHaveLength(2);
  });
  
  it('should run a small tournament', () => {
    const tournament = new Tournament2v2(['soldier', 'archer', 'warrior']);
    const results = tournament.runAll(1); // Just 1 run per matchup for speed
    
    // With 3 unit types, we get C(3+1,2) = 6 possible teams
    // Each team plays against all 6 teams = 36 matchups
    expect(results.size).toBe(36);
    
    const stats = tournament.getStats();
    expect(stats.size).toBeGreaterThan(0);
    
    // Each team should have played some games
    for (const [team, stat] of stats.entries()) {
      const total = stat.wins + stat.losses + stat.draws;
      expect(total).toBeGreaterThan(0);
    }
  });
  
  it('should track match duration correctly', () => {
    const match = new Match2v2({
      team1: ['soldier', 'soldier'],
      team2: ['soldier', 'soldier'],
      mapSize: 10, // Small map for faster combat
      maxSteps: 50
    });
    
    const result = match.run();
    
    // Should resolve quickly on a small map
    expect(result.duration).toBeLessThanOrEqual(50);
  });
  
  it('should complete matches within time limit', () => {
    const match = new Match2v2({
      team1: ['soldier', 'soldier'],
      team2: ['soldier', 'soldier'],
      mapSize: 10, // Small map
      maxSteps: 200
    });
    
    const result = match.run();
    
    // Match should complete
    expect(result).toBeDefined();
    expect(result.duration).toBeLessThanOrEqual(200);
    
    // Should have a result (winner or draw)
    expect(['team1', 'team2', 'draw']).toContain(result.winner);
  });
});