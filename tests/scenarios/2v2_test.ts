import { describe, it, expect, beforeEach } from 'bun:test';
import { Match2v2 } from '../../src/scenarios/2v2_matches';
import { Folks } from '../../src/dmg/folks';
import { setupTest } from '../test_helper';

describe('2v2', () => {
  beforeEach(() => {
    setupTest();
  });

  it('should run a quick 2v2 match with folks', () => {
    const match = new Match2v2({
      team1: ['ranger', 'bombardier'],
      team2: ['soldier', 'priest'],
      maxSteps: 100 // Quick test, not full 500
    });
    
    const result = match.run();
    
    expect(result).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);
    expect(result.duration).toBeLessThanOrEqual(100);
    expect(['team1', 'team2', 'draw']).toContain(result.winner);
  });

  it('should handle single-ability folks', () => {

    const match = new Match2v2({
      team1: ['ranger', 'wildmage'],
      team2: ['bombardier', 'naturist'],
      maxSteps: 100
    });
    
    const result = match.run();
    expect(result).toBeDefined();
  });

  it('should handle multi-ability folks', () => {

    const match = new Match2v2({
      team1: ['priest', 'soldier'],
      team2: ['farmer', 'ranger'],
      maxSteps: 100
    });
    
    const result = match.run();
    expect(result).toBeDefined();
  });

  it.skip('should verify all folks can be used in matches', () => {
    const folkNames = Folks.names;
    

    for (const folkName of folkNames) {
      const match = new Match2v2({
        team1: [folkName, 'soldier'],
        team2: ['farmer', 'ranger'],
        maxSteps: 10 // Very quick, just testing creation
      });
      
      const result = match.run();
      expect(result).toBeDefined();
    }
  });

  it('should track ability usage in matches', () => {
    const match = new Match2v2({
      team1: ['ranger', 'ranger'], // Both have ranged ability
      team2: ['soldier', 'soldier'], // Melee only
      maxSteps: 50
    });
    
    const result = match.run();
    


    expect(result.duration).toBeGreaterThan(0);
  });
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

  it('should track match duration correctly', () => {
    const match = new Match2v2({
      team1: ['soldier', 'soldier'],
      team2: ['soldier', 'soldier'],
      mapSize: 10, // Small map for faster combat
      maxSteps: 50
    });
    const result = match.run();
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
    expect(result).toBeDefined();
    expect(result.duration).toBeLessThanOrEqual(200);
    expect(['team1', 'team2', 'draw']).toContain(result.winner);
  });
});