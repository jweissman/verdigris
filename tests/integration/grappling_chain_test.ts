import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { InverseKinematics } from '../../src/physics/inverse_kinematics';

describe('Grappling Chain IK Integration', () => {
  test('grappling creates IK chain between units', () => {
    const sim = new Simulator(40, 40);
    
    // Create grappler unit
    const grappler = sim.addUnit({
      id: 'grappler',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      abilities: ['grapplingHook']
    });
    
    // Create target unit
    const target = sim.addUnit({
      id: 'target',
      pos: { x: 20, y: 10 },
      hp: 100,
      team: 'hostile'
    });
    
    console.log('Initial positions:', { grappler: grappler.pos, target: target.pos });
    
    // Fire grappling hook at target position
    sim.queuedCommands.push({
      type: 'grapple',
      unitId: 'grappler',
      params: {
        x: target.pos.x,
        y: target.pos.y
      }
    });
    
    sim.step();
    
    // Check that grappling was established
    const grappledTarget = sim.units.find(u => u.id === 'target');
    console.log('Target after grapple:', grappledTarget?.meta);
    
    // Now create IK chain for the grapple line
    const segmentLengths = [2, 2, 2, 2, 2]; // 5 segments of length 2
    const chain = InverseKinematics.solve(
      segmentLengths,
      grappler.pos,
      target.pos,
      5 // iterations
    );
    
    console.log('IK chain created with', chain.segments.length, 'segments');
    
    // Verify chain connects the two points
    expect(chain.origin).toEqual(grappler.pos);
    expect(chain.segments.length).toBe(5);
    
    // Last segment should end near target
    const lastSegment = chain.segments[chain.segments.length - 1];
    const endDistance = Math.sqrt(
      Math.pow(lastSegment.end.x - target.pos.x, 2) +
      Math.pow(lastSegment.end.y - target.pos.y, 2)
    );
    
    console.log('Chain end distance from target:', endDistance);
    expect(endDistance).toBeLessThan(0.1); // Should reach target
  });
  
  test('chain sags with gravity', () => {
    const sim = new Simulator(40, 40);
    
    const start = { x: 10, y: 10 };
    const end = { x: 30, y: 10 };
    
    // Create chain with physics
    const segmentLengths = [5, 5, 5, 5];
    const chain = InverseKinematics.solveWithPhysics(
      segmentLengths,
      start,
      end,
      0.5, // gravity
      0.3  // low stiffness for more sag
    );
    
    // Middle segments should sag down
    const middleSegment = chain.segments[1];
    console.log('Middle segment Y:', middleSegment.start.y, middleSegment.end.y);
    
    // Should sag below the straight line
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
    
    // Establish grapple at target position
    sim.queuedCommands.push({
      type: 'grapple',
      unitId: 'puller',
      params: {
        x: target.pos.x,
        y: target.pos.y
      }
    });
    
    sim.step();
    
    // Pull command
    sim.queuedCommands.push({
      type: 'pull',
      params: {
        grapplerId: 'puller',
        targetId: 'pulled',
        force: 2
      }
    });
    
    // Process pull
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    const pulledUnit = sim.units.find(u => u.id === 'pulled');
    console.log('Unit after pull:', pulledUnit?.pos);
    
    // Should have moved closer
    expect(pulledUnit?.pos.x).toBeLessThan(20);
  });
});