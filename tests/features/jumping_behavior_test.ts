import { describe, it, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Jumping behavior', () => {
  it('should not change facing direction while jumping', () => {
    const sim = new Simulator(20, 20);
    
    // Create a jumping unit facing right
    sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'red',
      hp: 10,
      meta: {
        facing: 'right',
        jumping: true,
        jumpProgress: 1,
        z: 5
      }
    });
    
    // Add a unit to the left that might trigger facing change
    sim.addUnit({
      id: 'target',
      pos: { x: 5, y: 10 },
      team: 'blue',
      hp: 10
    });
    
    const initialFacing = sim.roster.jumper.meta.facing;
    
    // Step should not change facing
    sim.step();
    
    expect(sim.roster.jumper.meta.facing).toBe(initialFacing);
  });

  it('should not queue movement commands for jumping units with hunt tag', () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: 'hunter',
      pos: { x: 0, y: 0 },
      team: 'red',
      hp: 10,
      tags: ['hunt'],
      meta: {
        jumping: true,
        jumpProgress: 5,
        z: 10
      }
    });
    
    sim.addUnit({
      id: 'prey',
      pos: { x: 5, y: 0 },
      team: 'blue',
      hp: 10
    });
    
    sim.step();
    
    // Should not have any move commands for jumping unit
    const moveCommands = sim.queuedCommands.filter(c => 
      c.type === 'move' && c.params?.unitId === 'hunter'
    );
    
    expect(moveCommands.length).toBe(0);
  });

  it('should continue jump trajectory through completion', () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: 'jumper',
      pos: { x: 5, y: 5 },
      team: 'red',
      hp: 10,
      meta: {
        jumping: true,
        jumpProgress: 0,
        jumpTarget: { x: 10, y: 5 },
        z: 0
      }
    });
    
    // Track z values over time
    const zValues = [];
    for (let i = 0; i < 12; i++) {
      sim.step();
      const jumper = sim.roster.jumper;
      if (jumper.meta?.jumping) {
        zValues.push(jumper.meta.z || 0);
      }
    }
    
    // Should have gone up then down (parabolic trajectory)
    const maxZ = Math.max(...zValues);
    const midIndex = Math.floor(zValues.length / 2);
    
    // Z should increase then decrease
    if (zValues.length > 2) {
      expect(zValues[midIndex]).toBeGreaterThan(zValues[0]);
      expect(zValues[midIndex]).toBeGreaterThan(zValues[zValues.length - 1]);
    }
  });

  it('should not have posture commands issued while jumping', () => {
    const sim = new Simulator(20, 20);
    
    sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      team: 'red',
      hp: 10,
      posture: 'pursue',
      meta: {
        jumping: true,
        jumpProgress: 3,
        z: 8
      }
    });
    
    sim.addUnit({
      id: 'enemy',
      pos: { x: 15, y: 10 },
      team: 'blue',
      hp: 10
    });
    
    sim.step();
    
    // Should not have pose or target commands for jumping unit
    const behaviorCommands = sim.queuedCommands.filter(c => 
      (c.type === 'pose' || c.type === 'target') && c.params?.unitId === 'jumper'
    );
    
    expect(behaviorCommands.length).toBe(0);
  });
});