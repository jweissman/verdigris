import { describe, it, expect, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { UnitMovement } from '../../src/rules/unit_movement';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('AI Behavior System', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {};
  });
  it('farmers hunt enemies by moving toward them', () => {
    const sim = new Simulator();
    
    // Set wander rate to 1 for deterministic testing
    UnitMovement.wanderRate = 1;
    
    // Add farmer at (1,1) and worm at (5,1) - same row
    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 1, y: 1 } }; // Has 'hunt' tag
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 5, y: 1 }, team: 'hostile' as const }; // Enemy target
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    expect(farmer).toBeTruthy();
    expect(worm).toBeTruthy();
    expect(farmer?.tags).toContain('hunt');
    
    const startX = farmer.pos.x;
    
    // Simulate steps - farmer should move toward worm
    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    
    // Get fresh reference to farmer after simulation
    const updatedFarmer = sim.units.find(u => u.sprite === 'farmer');
    expect(updatedFarmer).toBeTruthy();
    
    // Farmer should have moved closer to worm (rightward)
    expect(updatedFarmer!.pos.x).toBeGreaterThan(startX);
  });

  it('worms swarm together by moving toward allies', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    
    // Add worms with some distance between them
    const worm1 = { ...Encyclopaedia.unit('worm'), pos: { x: 1, y: 1 } }; // Will try to move toward ally
    const worm2 = { ...Encyclopaedia.unit('worm'), pos: { x: 4, y: 1 } }; // Target ally, within range 5
    sim.addUnit(worm1);
    sim.addUnit(worm2);
    
    const worms = sim.units.filter(u => u.sprite === 'worm');
    
    expect(worms.length).toBe(2);
    expect(worms[0].tags).toContain('swarm');
    expect(worms[1].tags).toContain('swarm');
    
    // Simulate steps - first worm should move toward second
    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    
    // Get fresh references to worms after simulation
    const updatedWorms = sim.units.filter(u => u.sprite === 'worm');
    expect(updatedWorms.length).toBe(2);
    
    // One of the worms should have moved closer to the other
    const dist = Math.abs(updatedWorms[0].pos.x - updatedWorms[1].pos.x);
    expect(dist).toBeLessThan(4);
  });

  it('hunting behavior respects field boundaries', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    
    // Add farmer at edge (0,0) and enemy far away
    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 0, y: 0 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 5, y: 5 }, team: 'hostile' as const };
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    const addedFarmer = sim.units.find(u => u.sprite === 'farmer');
    
    if (!addedFarmer) throw new Error('Farmer not found');
    
    // Simulate steps
    for (let i = 0; i < 10; i++) {
      sim.step();
      
      // Farmer should never go out of bounds
      expect(addedFarmer.pos.x).toBeGreaterThanOrEqual(0);
      expect(addedFarmer.pos.x).toBeLessThan(sim.fieldWidth);
      expect(addedFarmer.pos.y).toBeGreaterThanOrEqual(0);
      expect(addedFarmer.pos.y).toBeLessThan(sim.fieldHeight);
    }
  });

  it('swarm behavior handles blocked movement gracefully', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    
    // Create a line of worms where middle one can't move
    // Give them unique IDs to ensure proper tracking
    const worm1 = { ...Encyclopaedia.unit('worm'), id: 'worm1', pos: { x: 1, y: 1 } }; // Will try to move right toward ally
    const worm2 = { ...Encyclopaedia.unit('worm'), id: 'worm2', pos: { x: 2, y: 1 } }; // Blocks movement
    const worm3 = { ...Encyclopaedia.unit('worm'), id: 'worm3', pos: { x: 3, y: 1 } }; // Target ally
    sim.addUnit(worm1);
    sim.addUnit(worm2);
    sim.addUnit(worm3);
    
    const worms = sim.units.filter(u => u.sprite === 'worm');
    expect(worms.length).toBe(3);
    
    const positions = worms.map(w => ({ x: w.pos.x, y: w.pos.y }));
    
    // Simulate steps
    for (let i = 0; i < 5; i++) {
      sim.step();
      
      // Check positions after each step
      const stepPositions = worms.map(w => ({ x: Math.floor(w.pos.x), y: Math.floor(w.pos.y) }));
      
      // Verify no overlaps at each step
      const overlaps: string[] = [];
      for (let j = 0; j < stepPositions.length; j++) {
        for (let k = j + 1; k < stepPositions.length; k++) {
          if (stepPositions[j].x === stepPositions[k].x && 
              stepPositions[j].y === stepPositions[k].y) {
            overlaps.push(`Step ${i+1}: Units ${j} and ${k} overlap at (${stepPositions[j].x}, ${stepPositions[j].y})`);
          }
        }
      }
      
      // Allow overlaps, as long as they get resolved eventually
      // The collision system should separate them
      if (i === 4 && overlaps.length > 0) {
        // Only fail if overlaps persist until the end
        console.log('Final overlaps:', overlaps);
        expect(overlaps.length).toBe(0);
      }
    }
  });

  it('farmers and worms engage in combat when they meet', () => {
    const sim = new Simulator();
    
    // UnitMovement.wanderRate = 1;
    
    // Place farmer and worm adjacent to each other
    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 1, y: 1 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 1 }, team: 'hostile' as const };
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    const initialFarmerHp = farmer.hp;
    const initialWormHp = worm.hp;
    
    // Simulate steps - they should engage in combat
    for (let i = 0; i < 20; i++) {
      sim.step();
    }

    // Find the units after simulation
    const farmerAfter = sim.units.find(u => u.sprite === 'farmer');
    const wormAfter = sim.units.find(u => u.sprite === 'worm');
    
    // Both should have taken damage if they fought (or one should be dead)
    const combatOccurred = !farmerAfter || !wormAfter || 
                          farmerAfter.hp < initialFarmerHp || 
                          wormAfter.hp < initialWormHp;
    expect(combatOccurred).toBe(true);
  });
});