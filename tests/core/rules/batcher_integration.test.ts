import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';

describe('Pairwise Batcher Integration', () => {
  it('should generate combat commands through batcher', () => {
    const sim = new Simulator();
    
    sim.addUnit({ 
      id: 'soldier1', 
      pos: { x: 0, y: 0 }, 
      team: 'friendly', 
      hp: 10, 
      dmg: 2,
      mass: 1,
      state: 'idle'
    });
    
    sim.addUnit({ 
      id: 'worm1', 
      pos: { x: 1, y: 0 }, 
      team: 'hostile', 
      hp: 10, 
      dmg: 1,
      mass: 1,
      state: 'idle'
    });
    
    const initialSoldierHp = sim.roster['soldier1'].hp;
    const initialWormHp = sim.roster['worm1'].hp;
    
    // Step once - MeleeCombat should register intent, batcher should process
    sim.step();
    
    // Check if damage commands were generated
    const damageCommands = sim.queuedCommands.filter(c => c.type === 'damage');
    console.log('Damage commands after step:', damageCommands);
    
    // Process commands
    sim.step();
    
    // Check if damage was applied
    const finalSoldierHp = sim.roster['soldier1'].hp;
    const finalWormHp = sim.roster['worm1'].hp;
    
    console.log('Soldier HP:', initialSoldierHp, '->', finalSoldierHp);
    console.log('Worm HP:', initialWormHp, '->', finalWormHp);
    
    // At least one should have taken damage
    expect(finalSoldierHp < initialSoldierHp || finalWormHp < initialWormHp).toBe(true);
  });

  it('should handle knockback through batcher', () => {
    const sim = new Simulator();
    
    sim.addUnit({ 
      id: 'giant', 
      pos: { x: 0, y: 0 }, 
      team: 'hostile', 
      hp: 100, 
      mass: 10,
      state: 'idle'
    });
    
    sim.addUnit({ 
      id: 'worm', 
      pos: { x: 1, y: 0 }, 
      team: 'friendly', 
      hp: 10, 
      mass: 1,
      state: 'idle'
    });
    
    const initialWormX = sim.roster['worm'].pos.x;
    
    // Debug the step
    console.log('Initial state:');
    sim._debugUnits([sim.roster['giant'], sim.roster['worm']], 'Initial');
    
    sim.step();
    
    // Check what commands were generated
    const moveCommands = sim.queuedCommands.filter(c => c.type === 'move');
    console.log('Move commands generated:', moveCommands);
    
    console.log('\nAfter step:');
    sim._debugUnits([sim.roster['giant'], sim.roster['worm']], 'After step');
    
    const finalWormX = sim.roster['worm'].pos.x;
    
    // Worm should be pushed away
    expect(finalWormX).toBeGreaterThan(initialWormX);
  });
});