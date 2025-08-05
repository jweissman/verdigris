import { describe, it, expect } from 'bun:test';
import { Simulator } from '../src/simulator.ts';
import Encyclopaedia from '../src/dmg/encyclopaedia.ts';

describe('Megasquirrel Spacing', () => {
  it('should push other units away from phantom feet cells', () => {
    const sim = new Simulator(20, 20);
    
    // Add megasquirrel at (10, 5) - away from edges
    sim.addUnit({
      ...Encyclopaedia.unit('megasquirrel'),
      id: 'mega1',
      pos: { x: 10, y: 5 }
    });
    
    // Add a small unit adjacent to the megasquirrel 
    sim.addUnit({
      ...Encyclopaedia.unit('worm'),
      id: 'worm1', 
      pos: { x: 11, y: 5 } // Right next to megasquirrel head
    });
    
    const originalWormPos = { ...sim.creatureById('worm1').pos };
    
    // Run one step to let phantoms be created and knockback to occur
    sim.step();
    
    const worm = sim.creatureById('worm1');
    const mega = sim.creatureById('mega1');
    
    // The worm should have been pushed away
    const distance = Math.abs(worm.pos.x - mega.pos.x) + Math.abs(worm.pos.y - mega.pos.y);
    expect(distance).toBeGreaterThan(1); // Should be pushed away from direct adjacency
    
    // Megasquirrel should stay in place (not be pushed by the worm)
    expect(mega.pos.x).toBe(10);
    expect(mega.pos.y).toBe(5);
  });

  it('should prevent multiple megasquirrels from chaining together', () => {
    const sim = new Simulator(30, 20);
    
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
    
    console.log('Before steps:');
    console.log(`Mega1 at: (${sim.creatureById('mega1').pos.x}, ${sim.creatureById('mega1').pos.y})`);
    console.log(`Mega2 at: (${sim.creatureById('mega2').pos.x}, ${sim.creatureById('mega2').pos.y})`);
    
    // Run several steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const mega1 = sim.creatureById('mega1');
    const mega2 = sim.creatureById('mega2');
    
    console.log('After steps:');
    console.log(`Mega1 at: (${mega1.pos.x}, ${mega1.pos.y})`);
    console.log(`Mega2 at: (${mega2.pos.x}, ${mega2.pos.y})`); 
    
    const phantoms1 = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'mega1');
    const phantoms2 = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'mega2');
    console.log(`Mega1 phantoms: ${phantoms1.length}, Mega2 phantoms: ${phantoms2.length}`);
    
    console.log('Phantom positions:');
    phantoms1.forEach((p, i) => console.log(`  Mega1 phantom ${i}: (${p.pos.x}, ${p.pos.y})`));
    phantoms2.forEach((p, i) => console.log(`  Mega2 phantom ${i}: (${p.pos.x}, ${p.pos.y})`));
    
    // Check for overlaps - these should trigger knockback
    for (const p1 of phantoms1) {
      for (const p2 of phantoms2) {
        const dist = Math.sqrt((p1.pos.x - p2.pos.x)**2 + (p1.pos.y - p2.pos.y)**2);
        if (dist < 1.1) {
          console.log(`  OVERLAP: Phantom at (${p1.pos.x},${p1.pos.y}) and (${p2.pos.x},${p2.pos.y}) dist=${dist.toFixed(2)}`);
        }
      }
    }
    
    // They should be pushed apart (any direction indicates the mechanism works)
    const distance = Math.sqrt((mega2.pos.x - mega1.pos.x)**2 + (mega2.pos.y - mega1.pos.y)**2);
    console.log(`Final overall distance: ${distance.toFixed(2)} (started adjacent at ~1.0)`);
    expect(distance).toBeGreaterThan(1.0); // Should be pushed away from direct adjacency
  });
  
  it('should allow phantom units to push but not be pushed', () => {
    const sim = new Simulator(20, 20);
    
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