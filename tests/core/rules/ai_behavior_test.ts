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
    

    UnitMovement.wanderRate = 1;
    

    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 1, y: 1 } }; // Has 'hunt' tag
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 5, y: 1 }, team: 'hostile' as const }; // Enemy target
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    expect(farmer).toBeTruthy();
    expect(worm).toBeTruthy();
    expect(farmer?.tags).toContain('hunt');
    
    const startX = farmer.pos.x;
    

    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    

    const updatedFarmer = sim.units.find(u => u.sprite === 'farmer');
    expect(updatedFarmer).toBeTruthy();
    

    expect(updatedFarmer!.pos.x).toBeGreaterThan(startX);
  });

  it('worms swarm together by moving toward allies', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    

    const worm1 = { ...Encyclopaedia.unit('worm'), pos: { x: 1, y: 1 }, tags: ['swarm'] }; // Will try to move toward ally
    const worm2 = { ...Encyclopaedia.unit('worm'), pos: { x: 4, y: 1 }, tags: ['swarm'] }; // Target ally, within range 5
    sim.addUnit(worm1);
    sim.addUnit(worm2);
    
    const worms = sim.units.filter(u => u.sprite === 'worm');
    
    expect(worms.length).toBe(2);
    expect(worms[0].tags).toContain('swarm');
    expect(worms[1].tags).toContain('swarm');
    

    for (let i = 0; i < 3; i++) {
      sim.step();
    }
    

    const updatedWorms = sim.units.filter(u => u.sprite === 'worm');
    expect(updatedWorms.length).toBe(2);
    

    const dist = Math.abs(updatedWorms[0].pos.x - updatedWorms[1].pos.x);
    expect(dist).toBeLessThan(4);
  });

  it('hunting behavior respects field boundaries', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    

    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 0, y: 0 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 5, y: 5 }, team: 'hostile' as const };
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    const addedFarmer = sim.units.find(u => u.sprite === 'farmer');
    
    if (!addedFarmer) throw new Error('Farmer not found');
    

    for (let i = 0; i < 10; i++) {
      sim.step();
      

      expect(addedFarmer.pos.x).toBeGreaterThanOrEqual(0);
      expect(addedFarmer.pos.x).toBeLessThan(sim.fieldWidth);
      expect(addedFarmer.pos.y).toBeGreaterThanOrEqual(0);
      expect(addedFarmer.pos.y).toBeLessThan(sim.fieldHeight);
    }
  });

  it('swarm behavior handles blocked movement gracefully', () => {
    const sim = new Simulator();
    
    UnitMovement.wanderRate = 1;
    


    const worm1 = { ...Encyclopaedia.unit('swarmbot'), id: 'swarm1', pos: { x: 1, y: 1 } }; // Will try to move toward center
    const worm2 = { ...Encyclopaedia.unit('swarmbot'), id: 'swarm2', pos: { x: 2, y: 1 } }; // Center unit
    const worm3 = { ...Encyclopaedia.unit('swarmbot'), id: 'swarm3', pos: { x: 3, y: 1 } }; // Will try to move toward center
    sim.addUnit(worm1);
    sim.addUnit(worm2);
    sim.addUnit(worm3);
    
    const worms = sim.units.filter(u => u.sprite === 'swarmbot');
    expect(worms.length).toBe(3);
    
    const positions = worms.map(w => ({ x: w.pos.x, y: w.pos.y }));
    

    for (let i = 0; i < 5; i++) {
      sim.step();
      

      const stepPositions = worms.map(w => ({ x: Math.floor(w.pos.x), y: Math.floor(w.pos.y) }));
      

      const overlaps: string[] = [];
      for (let j = 0; j < stepPositions.length; j++) {
        for (let k = j + 1; k < stepPositions.length; k++) {
          if (stepPositions[j].x === stepPositions[k].x && 
              stepPositions[j].y === stepPositions[k].y) {
            overlaps.push(`Step ${i+1}: Units ${j} and ${k} overlap at (${stepPositions[j].x}, ${stepPositions[j].y})`);
          }
        }
      }
      


      if (i === 4 && overlaps.length > 0) {

        expect(overlaps.length).toBe(0);
      }
    }
  });

  it('farmers and worms engage in combat when they meet', () => {
    const sim = new Simulator();
    

    

    const farmer = { ...Encyclopaedia.unit('farmer'), pos: { x: 1, y: 1 } };
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 2, y: 1 }, team: 'hostile' as const };
    sim.addUnit(farmer);
    sim.addUnit(worm);
    
    const initialFarmerHp = farmer.hp;
    const initialWormHp = worm.hp;
    

    for (let i = 0; i < 20; i++) {
      sim.step();
    }


    const farmerAfter = sim.units.find(u => u.sprite === 'farmer');
    const wormAfter = sim.units.find(u => u.sprite === 'worm');
    

    const combatOccurred = !farmerAfter || !wormAfter || 
                          farmerAfter.hp < initialFarmerHp || 
                          wormAfter.hp < initialWormHp;
    expect(combatOccurred).toBe(true);
  });
});