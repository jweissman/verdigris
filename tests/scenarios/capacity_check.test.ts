import { describe, test, expect } from 'bun:test';
import { Tournament2v2 } from '../../src/scenarios/2v2_matches';

describe.skip('2v2 Capacity Check', () => {
  test('tournament with summoners completes without capacity issues', () => {
    // Test with units that can summon
    const summoners = ['toymaker', 'druid', 'engineer'];
    const tournament = new Tournament2v2(summoners);
    
    let completed = false;
    let errorMessage = '';
    
    // Hook into console.error to catch capacity errors
    const originalError = console.error;
    console.error = (...args) => {
      const msg = args.join(' ');
      if (msg.includes('Capacity exceeded')) {
        errorMessage = msg;
      }
      originalError(...args);
    };
    
    try {
      // Run just a few matches to test
      // 3 unit types = 6 teams (3C2 + pure teams)
      // 6 x 6 = 36 matches total
      tournament.runAll(1);
      completed = true;
    } catch (e) {
      errorMessage = e.message;
    } finally {
      console.error = originalError;
    }
    
    expect(completed).toBe(true);
    expect(errorMessage).toBe('');
  });
});