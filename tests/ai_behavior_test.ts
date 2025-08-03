import { describe, it, expect } from 'bun:test';
import { Freehold } from '../src/freehold';
import { UnitMovement } from '../src/rules/unit_movement';

describe('AI Behavior System', () => {
  it('farmers hunt enemies by moving toward them', () => {
    const canvas = { 
      width: 320, height: 200,
      getContext: () => ({}) 
    } as any;
    const fh = new Freehold(canvas);
    
    // Set wander rate to 1 for deterministic testing
    UnitMovement.wanderRate = 1;
    
    // Add farmer at (1,1) and worm at (5,1) - same row
    fh.addFarmer(1, 1); // Has 'hunt' tag
    fh.addWorm(5, 1);   // Enemy target
    
    const farmer = fh.sim.units.find(u => u.sprite === 'farmer');
    const worm = fh.sim.units.find(u => u.sprite === 'worm');
    
    expect(farmer).toBeTruthy();
    expect(worm).toBeTruthy();
    expect(farmer?.tags).toContain('hunt');
    
    if (!farmer || !worm) throw new Error('Units not found');
    
    const startX = farmer.pos.x;
    
    // Simulate steps - farmer should move toward worm
    for (let i = 0; i < 3; i++) {
      fh.sim.step();
    }
    
    // Get fresh reference to farmer after simulation
    const updatedFarmer = fh.sim.units.find(u => u.sprite === 'farmer');
    expect(updatedFarmer).toBeTruthy();
    
    // Farmer should have moved closer to worm (rightward)
    expect(updatedFarmer!.pos.x).toBeGreaterThan(startX);
  });

  it('worms swarm together by moving toward allies', () => {
    const canvas = { 
      width: 320, height: 200,
      getContext: () => ({}) 
    } as any;
    const fh = new Freehold(canvas);
    
    UnitMovement.wanderRate = 1;
    
    // Add worms with some distance between them
    fh.addWorm(1, 1, ["swarm"]); // Will try to move toward ally
    fh.addWorm(5, 1, ["swarm"]); // Target ally
    
    const worms = fh.sim.units.filter(u => u.sprite === 'worm');
    
    expect(worms.length).toBe(2);
    expect(worms[0].tags).toContain('swarm');
    expect(worms[1].tags).toContain('swarm');
    
    // Simulate steps - first worm should move toward second
    for (let i = 0; i < 3; i++) {
      fh.sim.step();
    }
    
    // Get fresh references to worms after simulation
    const updatedWorms = fh.sim.units.filter(u => u.sprite === 'worm');
    expect(updatedWorms.length).toBe(2);
    
    // One of the worms should have moved closer to the other
    const dist = Math.abs(updatedWorms[0].pos.x - updatedWorms[1].pos.x);
    expect(dist).toBeLessThan(4);
  });

  it('hunting behavior respects field boundaries', () => {
    const canvas = { 
      width: 320, height: 200,
      getContext: () => ({}) 
    } as any;
    const fh = new Freehold(canvas);
    
    UnitMovement.wanderRate = 1;
    
    // Add farmer at edge (0,0) and enemy far away
    fh.addFarmer(0, 0);
    fh.addWorm(5, 5);
    
    const farmer = fh.sim.units.find(u => u.sprite === 'farmer');
    
    if (!farmer) throw new Error('Farmer not found');
    
    // Simulate steps
    for (let i = 0; i < 10; i++) {
      fh.sim.step();
      
      // Farmer should never go out of bounds
      expect(farmer.pos.x).toBeGreaterThanOrEqual(0);
      expect(farmer.pos.x).toBeLessThan(fh.sim.fieldWidth);
      expect(farmer.pos.y).toBeGreaterThanOrEqual(0);
      expect(farmer.pos.y).toBeLessThan(fh.sim.fieldHeight);
    }
  });

  it('swarm behavior handles blocked movement gracefully', () => {
    const canvas = { 
      width: 320, height: 200,
      getContext: () => ({}) 
    } as any;
    const fh = new Freehold(canvas);
    
    UnitMovement.wanderRate = 1;
    
    // Create a line of worms where middle one can't move
    fh.addWorm(1, 1); // Will try to move right toward ally
    fh.addWorm(2, 1); // Blocks movement  
    fh.addWorm(3, 1); // Target ally
    
    const worms = fh.sim.units.filter(u => u.sprite === 'worm');
    expect(worms.length).toBe(3);
    
    const positions = worms.map(w => ({ x: w.pos.x, y: w.pos.y }));
    
    // Simulate steps
    for (let i = 0; i < 5; i++) {
      fh.sim.step();
    }
    
    // Units should still be in valid positions (not overlapping)
    const finalPositions = worms.map(w => ({ x: w.pos.x, y: w.pos.y }));
    
    // Check no two units occupy same cell
    for (let i = 0; i < finalPositions.length; i++) {
      for (let j = i + 1; j < finalPositions.length; j++) {
        const same = finalPositions[i].x === finalPositions[j].x && 
                    finalPositions[i].y === finalPositions[j].y;
        expect(same).toBe(false);
      }
    }
  });

  it('farmers and worms engage in combat when they meet', () => {
    const canvas = { 
      width: 320, height: 200,
      getContext: () => ({}) 
    } as any;
    const fh = new Freehold(canvas);
    
    UnitMovement.wanderRate = 1;
    
    // Place farmer and worm adjacent to each other
    let _farmerId = fh.addFarmer(1, 1);
    let _wormId = fh.addWorm(2, 1);
    
    // const farmer = fh.sim.units.find(u => u.id === farmerId);
    // const worm = fh.sim.units.find(u => u.id === wormId);
    // fh.sim.roster
    
    // if (!farmer || !worm) throw new Error('Units not found');
    // console.log("Roster after adding units:", fh.sim.roster);
    
    const initialFarmerHp = fh.sim.roster.farmer.hp;
    const initialWormHp = fh.sim.roster.worm.hp;
    
    // Simulate steps - they should engage in combat
    for (let i = 0; i < 10; i++) {
      fh.sim.step();
    }

    // debugger;
    
    // Both should have taken damage if they fought
    const combatOccurred = fh.sim.roster.farmer.hp < initialFarmerHp || fh.sim.roster.worm.hp < initialWormHp;
    expect(combatOccurred).toBe(true);
  });
});