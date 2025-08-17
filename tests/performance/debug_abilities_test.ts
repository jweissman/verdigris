import { describe, test } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Debug Abilities', () => {
  test('Check if neutral units have abilities', () => {
    const sim = new Simulator(50, 50);
    
    // Add one neutral unit with NO abilities
    sim.addUnit({
      id: 'test_unit',
      pos: { x: 25, y: 25 },
      team: 'neutral',
      hp: 20,
      abilities: []  // Explicitly empty
    });
    
    const context = sim.getTickContext();
    const units = context.getAllUnits();
    
    console.log('\n=== Unit Debug ===');
    for (const unit of units) {
      console.log(`Unit ${unit.id}:`);
      console.log(`  abilities: ${JSON.stringify(unit.abilities)}`);
      console.log(`  abilities.length: ${unit.abilities?.length}`);
      console.log(`  meta.burrowed: ${unit.meta?.burrowed}`);
      console.log(`  team: ${unit.team}`);
      console.log(`  tags: ${JSON.stringify(unit.tags)}`);
      
      // Check if this unit would be filtered out
      const hasAbilities = unit.abilities && unit.abilities.length > 0;
      const isBurrowed = unit.meta?.burrowed;
      const wouldProcess = hasAbilities || isBurrowed;
      
      console.log(`  Would Abilities rule process this unit? ${wouldProcess}`);
    }
  });
});