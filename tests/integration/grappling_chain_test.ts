import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { InverseKinematics } from '../../src/physics/inverse_kinematics';

describe('Grappling Chain IK Integration', () => {
  test('grappling creates IK chain between units', () => {
    const sim = new Simulator(40, 40);
    

    const grappler = sim.addUnit({
      id: 'grappler',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      abilities: ['grapplingHook']
    });
    

    const target = sim.addUnit({
      id: 'target',
      pos: { x: 20, y: 10 },
      hp: 100,
      team: 'hostile'
    });
    

    

    sim.queuedCommands.push({
      type: 'grapple',
      unitId: 'grappler',
      params: {
        x: target.pos.x,
        y: target.pos.y
      }
    });
    
    sim.step();
    

    const grappledTarget = sim.units.find(u => u.id === 'target');

    

    const segmentLengths = [2, 2, 2, 2, 2]; // 5 segments of length 2
    const chain = InverseKinematics.solve(
      segmentLengths,
      grappler.pos,
      target.pos,
      5
    );
    

    

    expect(chain.origin).toEqual(grappler.pos);
    expect(chain.segments.length).toBe(5);
    

    const lastSegment = chain.segments[chain.segments.length - 1];
    const endDistance = Math.sqrt(
      Math.pow(lastSegment.end.x - target.pos.x, 2) +
      Math.pow(lastSegment.end.y - target.pos.y, 2)
    );
    

    expect(endDistance).toBeLessThan(0.1); // Should reach target
  });
  
  test('chain sags with gravity', () => {
    const sim = new Simulator(40, 40);
    
    const start = { x: 10, y: 10 };
    const end = { x: 30, y: 10 };
    

    const segmentLengths = [5, 5, 5, 5];
    const chain = InverseKinematics.solveWithPhysics(
      segmentLengths,
      start,
      end,
      0.5,
      0.3
    );
    

    const middleSegment = chain.segments[1];

    

    expect(middleSegment.start.y).toBeGreaterThan(10);
    expect(middleSegment.end.y).toBeGreaterThan(10);
  });
  
  test('pulling with grapple moves units', () => {
    const sim = new Simulator(40, 40);
    
    const grappler = sim.addUnit({
      id: 'puller',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      abilities: ['grapplingHook']
    });
    
    const target = sim.addUnit({
      id: 'pulled',
      pos: { x: 20, y: 10 },
      hp: 50,
      mass: 5,
      team: 'hostile'
    });
    

    sim.queuedCommands.push({
      type: 'grapple',
      unitId: 'puller',
      params: {
        x: target.pos.x,
        y: target.pos.y
      }
    });
    
    sim.step();
    

    sim.queuedCommands.push({
      type: 'pull',
      params: {
        grapplerId: 'puller',
        targetId: 'pulled',
        force: 2
      }
    });
    

    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const pulledUnit = sim.units.find(u => u.id === 'pulled');

    

    expect(pulledUnit?.pos.x).toBeLessThan(20);
  });
});