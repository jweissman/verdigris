import { describe, expect, it, beforeEach } from 'bun:test';
import { Match2v2 } from '../../src/scenarios/2v2_matches';
import { Folks } from '../../src/dmg/folks';
import { setupTest } from '../test_helper';

describe('Folks 2v2 Matches', () => {



  it.skip('should handle support folks', () => {
    const match = new Match2v2({
      team1: ['mechanic', 'builder'], // Support units
      team2: ['mindmender', 'naturist'], // Healers
      maxSteps: 100
    });
    
    const result = match.run();
    

    expect(result).toBeDefined();
    if (result.duration === 100) {
      expect(result.winner).toBe('draw');
    }
  });
});