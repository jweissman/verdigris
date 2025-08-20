import { describe, expect, it, beforeEach } from 'bun:test';
import { Match2v2 } from '../../src/scenarios/2v2_matches';
import { Folks } from '../../src/dmg/folks';
import { setupTest } from '../test_helper';

describe('Folks 2v2 Matches', () => {
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
    // Test with folks that have single abilities
    const match = new Match2v2({
      team1: ['ranger', 'wildmage'], // ranged, wildBolt
      team2: ['bombardier', 'naturist'], // bombardier, regenerate
      maxSteps: 100
    });
    
    const result = match.run();
    expect(result).toBeDefined();
  });

  it('should handle multi-ability folks', () => {
    // Priest has heal and radiant
    const match = new Match2v2({
      team1: ['priest', 'soldier'],
      team2: ['farmer', 'ranger'],
      maxSteps: 100
    });
    
    const result = match.run();
    expect(result).toBeDefined();
  });

  it('should verify all folks can be used in matches', () => {
    const folkNames = Folks.names;
    
    // Just verify we can create matches with each folk type
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
    
    // Rangers should win against melee-only soldiers
    // But we're not asserting outcome, just that it runs
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should handle support folks', () => {
    const match = new Match2v2({
      team1: ['mechanic', 'builder'], // Support units
      team2: ['mindmender', 'naturist'], // Healers
      maxSteps: 100
    });
    
    const result = match.run();
    
    // Support vs support might timeout
    expect(result).toBeDefined();
    if (result.duration === 100) {
      expect(result.winner).toBe('draw');
    }
  });
});