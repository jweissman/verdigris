import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Trace Rule Commands', () => {
  test('Find which rule generates meta commands', () => {
    const sim = new Simulator(50, 50);
    

    sim.addUnit({
      id: 'test_unit',
      pos: { x: 25, y: 25 },
      team: 'neutral',
      hp: 20,
      abilities: []
    });
    

    const context = sim.getTickContext();
    
    console.log('\n=== Testing each rule individually ===');
    

    for (const rule of sim.rulebook) {
      const ruleName = rule.constructor.name;
      const commands = rule.execute(context);
      
      if (commands && commands.length > 0) {
        console.log(`${ruleName}: ${commands.length} commands`);
        

        const metaCommands = commands.filter(c => c.type === 'meta');
        if (metaCommands.length > 0) {
          console.log(`  -> ${metaCommands.length} meta commands!`);
          console.log('  First meta:', JSON.stringify(metaCommands[0], null, 2));
        }
      }
    }
  });
});