import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Trace Meta Commands', () => {
  test('Find where meta commands originate', () => {
    const sim = new Simulator(50, 50);
    

    sim.addUnit({
      id: 'test_unit',
      pos: { x: 25, y: 25 },
      team: 'neutral',
      hp: 20,
      abilities: []
    });
    

    const originalPush = sim.queuedCommands.push;
    sim.queuedCommands.push = function(...items) {
      for (const item of items) {
        if (item.type === 'meta') {
          console.log('Meta command added:', item);
          console.trace('Stack trace for meta command');
        }
      }
      return originalPush.call(this, ...items);
    };
    
    console.log('\n=== Running one step to trace meta commands ===');
    sim.step();
    console.log('Step complete');
  });
});