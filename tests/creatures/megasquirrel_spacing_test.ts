import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia.ts';
import { HugeUnits } from '../../src/rules/huge_units.ts';
import { Knockback } from '../../src/rules/knockback.ts';

describe('Megasquirrel Spacing', () => {
  it('should push other units away from phantom feet cells', () => {
    const sim = new Simulator(20, 20);
    // Use default rulebook which includes HugeUnits, Knockback, and CommandHandler
    
    // Add megasquirrel at (10, 5) - away from edges
    const mega = {
      ...Encyclopaedia.unit('megasquirrel'),
      id: 'mega1',
      pos: { x: 10, y: 5 }
    };
    // Remove hunt tag and set wait posture for this test - we don't want the megasquirrel to move
    mega.tags = mega.tags.filter(t => t !== 'hunt');
    mega.posture = 'wait'; // Explicitly set wait posture
    mega.intendedMove = { x: 0, y: 0 }; // Explicitly set no movement
    sim.addUnit(mega);
    
    // Add a small unit adjacent to the megasquirrel 
    const wormUnit = {
      ...Encyclopaedia.unit('worm'),
      id: 'worm1', 
      pos: { x: 11, y: 5 } // Right next to megasquirrel head
    };
    // Remove any movement-related tags from worm and set wait posture
    wormUnit.tags = wormUnit.tags.filter(t => t !== 'hunt' && t !== 'swarm');
    wormUnit.posture = 'wait';
    wormUnit.intendedMove = { x: 0, y: 0 };
    sim.addUnit(wormUnit);
    
    const originalWormPos = { ...sim.creatureById('worm1').pos };
    
    // Run one step to let phantoms be created and knockback to occur
    sim.step();
    
    const worm = sim.creatureById('worm1');
    const megaAfter = sim.creatureById('mega1');
    
    // The worm should have been pushed away
    const distance = Math.abs(worm.pos.x - megaAfter.pos.x) + Math.abs(worm.pos.y - megaAfter.pos.y);
    expect(distance).toBeGreaterThan(1); // Should be pushed away from direct adjacency
    
    // Megasquirrel should stay in place (not be pushed by the worm)
    expect(megaAfter.pos.x).toBe(10);
    expect(megaAfter.pos.y).toBe(5);
  });

  // NOTE: flaky somehow -- we should identify sources of randomness in the simulation and centralize them i think?
  it.skip('should prevent multiple megasquirrels from chaining together', () => {
    const sim = new Simulator(30, 20);
    // Use default rulebook which includes HugeUnits, Knockback, and CommandHandler
    
    // Add two megasquirrels with overlapping body spaces
    sim.addUnit({
      ...Encyclopaedia.unit('megasquirrel'),
      id: 'mega1',
      pos: { x: 10, y: 5 }
    });
    
    sim.addUnit({
      ...Encyclopaedia.unit('megasquirrel'),
      id: 'mega2', 
      pos: { x: 10, y: 6 } // Only 1 cell away - heads should be adjacent for knockback
    });
    
    
    // Run several steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const mega1 = sim.creatureById('mega1');
    const mega2 = sim.creatureById('mega2');
    
    
    const phantoms1 = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'mega1');
    const phantoms2 = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'mega2');
    
    
    // Check for overlaps - these should trigger knockback
    for (const p1 of phantoms1) {
      for (const p2 of phantoms2) {
        const dist = Math.sqrt((p1.pos.x - p2.pos.x)**2 + (p1.pos.y - p2.pos.y)**2);
        if (dist < 1.1) {
        }
      }
    }
    
    // They should be pushed apart (any direction indicates the mechanism works)
    const distance = Math.sqrt((mega2.pos.x - mega1.pos.x)**2 + (mega2.pos.y - mega1.pos.y)**2);
    expect(distance).toBeGreaterThan(1.0); // Should be pushed away from direct adjacency
  });
  
  it('should allow phantom units to push but not be pushed', () => {
    const sim = new Simulator(20, 20);
    // Use default rulebook which includes HugeUnits, Knockback, and CommandHandler
    
    // Add megasquirrel
    sim.addUnit({
      ...Encyclopaedia.unit('megasquirrel'),
      id: 'mega1',
      pos: { x: 10, y: 10 }
    });
    
    // Add heavy unit next to phantom
    sim.addUnit({
      ...Encyclopaedia.unit('soldier'),
      id: 'soldier1',
      pos: { x: 10, y: 11 }, // Next to first phantom
      mass: 10 // Heavy unit
    });
    
    sim.step();
    
    const soldier = sim.creatureById('soldier1');
    const phantoms = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'mega1');
    
    // Soldier should be pushed away despite being heavy
    expect(soldier.pos.y).not.toBe(11);
    
    // Phantom should stay in place (part of megasquirrel body)
    expect(phantoms[0].pos.y).toBe(11);
  });
});