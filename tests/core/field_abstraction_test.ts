import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Unit } from '../../src/sim/types.ts';

describe('Field Abstraction (Real vs Apparent)', () => {
  it('should block movement into huge unit body cells', () => {
    const sim = new Simulator(10, 10);

    

    const megasquirrel: Unit = {
      id: 'mega1',
      pos: { x: 2, y: 2 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly',
      sprite: 'megasquirrel',
      state: 'idle',
      hp: 40,
      maxHp: 40,
      mass: 8,
      abilities: [],
      meta: { huge: true }
    };
    

    const worm: Unit = {
      id: 'worm1',
      pos: { x: 1, y: 3 },
      intendedMove: { x: 0, y: 0 },
      team: 'hostile',
      sprite: 'worm',
      state: 'idle',
      hp: 10,
      maxHp: 10,
      mass: 1,
      abilities: [],
      meta: {}
    };
    
    sim.addUnit(megasquirrel);
    sim.addUnit(worm);
    sim.step(); // Let huge unit rule create phantoms
    

    expect(sim.validMove(worm, 1, 0)).toBe(false); // (1,3) -> (2,3) blocked by body
    expect(sim.validMove(worm, 1, 1)).toBe(false); // (1,3) -> (2,4) blocked by body  
    expect(sim.validMove(worm, 1, -1)).toBe(false); // (1,3) -> (2,2) blocked by head
    

    expect(sim.validMove(worm, 0, 1)).toBe(true); // (1,3) -> (1,4) is free
    expect(sim.validMove(worm, -1, 0)).toBe(true); // (1,3) -> (0,3) is free
  });

  it('should allow huge units to move as single entity', () => {
    const sim = new Simulator(10, 10);
    
    // Keep only movement and huge units rules
    sim.rulebook = [
      sim.rulebook.find(r => r.constructor.name === 'UnitMovement')!,
      sim.rulebook.find(r => r.constructor.name === 'HugeUnits')!
    ];
    
    const megasquirrel: Unit = {
      id: 'mega2', // Use unique ID for this test
      pos: { x: 2, y: 2 },
      intendedMove: { x: 1, y: 0 }, // Try to move right
      team: 'friendly',
      sprite: 'megasquirrel', 
      state: 'idle',
      hp: 40,
      maxHp: 40,
      mass: 8,
      abilities: [],
      meta: { huge: true }
    };
    
    sim.addUnit(megasquirrel);
    


    expect(sim.validMove(megasquirrel, 1, 0)).toBe(true); // (2,2) -> (3,2) should be valid
    

    const initialX = megasquirrel.pos.x;
    sim.queuedCommands.push({
      type: 'move',
      params: {
        unitId: 'mega2',
        dx: 1,
        dy: 0
      }
    });
    sim.step(); // This should handle both movement and phantom management automatically
    

    const updatedMegasquirrel = sim.units.find(u => u.id === 'mega2' && !u.meta.phantom)!;

    expect(updatedMegasquirrel.pos.x).toBe(3); // Moved right by 1
    expect(updatedMegasquirrel.pos.y).toBe(2); // Y unchanged
    

    expect(sim.validMove(updatedMegasquirrel, 1, 0)).toBe(true); // Can continue moving right
  });

  it('should prevent huge unit movement when body would collide', () => {
    const sim = new Simulator(10, 10);

    
    const megasquirrel: Unit = {
      id: 'mega1',
      pos: { x: 2, y: 2 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly',
      sprite: 'megasquirrel',
      state: 'idle', 
      hp: 40,
      maxHp: 40,
      mass: 8,
      abilities: [],
      meta: { huge: true }
    };
    

    const blocker: Unit = {
      id: 'blocker',
      pos: { x: 3, y: 4 }, // This would block megasquirrel moving right
      intendedMove: { x: 0, y: 0 },
      team: 'hostile',
      sprite: 'worm',
      state: 'idle',
      hp: 10,
      maxHp: 10, 
      mass: 1,
      abilities: [],
      meta: {}
    };
    
    sim.addUnit(megasquirrel);
    sim.addUnit(blocker);
    sim.step(); // Create phantoms
    

    const megasquirrelUnit = sim.roster['megasquirrel'];
    

    expect(sim.validMove(megasquirrelUnit, 1, 0)).toBe(false);
  });

  it('should support querying apparent field vs real field', () => {
    const sim = new Simulator(10, 10);

    
    const megasquirrel: Unit = {
      id: 'mega1', 
      pos: { x: 2, y: 2 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly',
      sprite: 'megasquirrel',
      state: 'idle',
      hp: 40,
      maxHp: 40,
      mass: 8,
      abilities: [],  
      meta: { huge: true }
    };
    
    sim.addUnit(megasquirrel);
    sim.step(); // Create phantoms
    
    

    expect(sim.getRealUnits()).toHaveLength(1);
    expect(sim.getRealUnits()[0].id).toBe('mega1');
    

    expect(sim.getApparentUnits()).toHaveLength(4);
    
    

    expect(sim.isApparentlyOccupied(2, 2)).toBe(true); // Head
    expect(sim.isApparentlyOccupied(2, 3)).toBe(true); // Body
    expect(sim.isApparentlyOccupied(2, 4)).toBe(true); // Body  
    expect(sim.isApparentlyOccupied(2, 5)).toBe(true); // Body
    expect(sim.isApparentlyOccupied(2, 6)).toBe(false); // Empty
  });
});