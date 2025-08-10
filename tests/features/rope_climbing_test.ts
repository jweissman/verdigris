import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { RopeClimbing } from '../../src/rules/rope_climbing';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe.skip('Rope Climbing Mechanics', () => {
  let sim: Simulator;
  let ropeClimbing: RopeClimbing;
  let grapplingPhysics: GrapplingPhysics;

  beforeEach(() => {
    sim = new Simulator(40, 25);
    ropeClimbing = new RopeClimbing(sim);
    grapplingPhysics = new GrapplingPhysics(sim);
    sim.rulebook = [grapplingPhysics, ropeClimbing];
  });

  it('should allow worm-hunter to climb grapple lines', () => {
    // Create a worm-hunter with climbing ability
    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter1',
      pos: { x: 8, y: 10 }
    };
    
    // Verify hunter can climb grapples
    expect(hunter.meta.canClimbGrapples).toBe(true);
    
    sim.addUnit(hunter);
    
    // Debug: Check if hunter is in roster
    console.log('Hunter in roster after add:', sim.roster['hunter1'] ? 'YES' : 'NO');
    console.log('Roster keys:', Object.keys(sim.roster));
    
    // Create a grappler and target to establish a line
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler1',
      pos: { x: 5, y: 10 },
      team: 'hostile' as const
    };
    
    const target = {
      ...Encyclopaedia.unit('soldier'),
      id: 'target1',
      pos: { x: 12, y: 10 },
      team: 'friendly' as const,
      meta: {
        grappled: true,
        grappledBy: 'grappler1',
        tetherPoint: { x: 5, y: 10 },
        grappledDuration: 60
      }
    };
    
    sim.addUnit(grappler);
    sim.addUnit(target);
    
    // Create grapple line manually
    (grapplingPhysics as any).grappleLines.set('grappler1_target1', {
      grapplerID: 'grappler1',
      targetID: 'target1',
      startPos: { x: 5, y: 10 },
      endPos: { x: 12, y: 10 },
      length: 7,
      taut: true,
      pinned: false,
      duration: 60
    });
    
    // Apply grappling to create line particles
    grapplingPhysics.apply();
    
    // Now apply rope climbing
    ropeClimbing.apply();
    
    // Get the updated hunter from the sim roster
    const hunterInSim = sim.roster['hunter1'];
    
    // Hunter should detect the nearby grapple line
    // Since the hunter is at x:8, between grappler (x:5) and target (x:12)
    // and the line is horizontal at y:10, hunter should attach
    expect(hunterInSim?.meta.climbingLine).toBeDefined();
  });
  
  it('should move climber along the grapple line', () => {
    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter1',
      pos: { x: 6, y: 10 },
      meta: {
        ...Encyclopaedia.unit('worm-hunter').meta,
        climbingLine: true,
        lineStart: { x: 5, y: 10 },
        lineEnd: { x: 15, y: 10 },
        climbProgress: 0.2, // 20% along the line
        climbDirection: 1, // Moving toward end
        moveSpeed: 1.5
      }
    };
    
    sim.addUnit(hunter);
    
    const initialProgress = hunter.meta.climbProgress;
    const initialX = hunter.pos.x;
    
    // Update climbing
    ropeClimbing.apply();
    
    // Get the updated hunter from the sim roster
    const hunterAfter = sim.roster['hunter1'];
    
    // Progress should increase
    expect(hunterAfter?.meta.climbProgress).toBeGreaterThan(initialProgress);
    
    // Position should update based on progress
    const expectedX = 5 + (15 - 5) * hunter.meta.climbProgress;
    expect(hunter.pos.x).toBeCloseTo(expectedX, 1);
  });
  
  it('should detach when reaching the end of the line', () => {
    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter1',
      pos: { x: 14, y: 10 },
      meta: {
        ...Encyclopaedia.unit('worm-hunter').meta,
        climbingLine: true,
        lineStart: { x: 5, y: 10 },
        lineEnd: { x: 15, y: 10 },
        climbProgress: 0.95, // Almost at the end
        climbDirection: 1,
        moveSpeed: 1.5
      }
    };
    
    const enemy = {
      ...Encyclopaedia.unit('soldier'),
      id: 'enemy1',
      pos: { x: 15, y: 10 },
      team: 'hostile' as const,
      hp: 30,
      maxHp: 30
    };
    
    sim.addUnit(hunter);
    sim.addUnit(enemy);
    
    // Update climbing - should reach end and attack
    ropeClimbing.apply();
    
    // Get the updated hunter from the sim roster
    const hunterAfter = sim.roster['hunter1'];
    
    // Should detach after reaching end
    expect(hunterAfter?.meta.climbingLine).toBeUndefined();
    
    // Enemy should take damage from climb attack
    expect(enemy.hp).toBeLessThan(30);
  });
  
  it('should detach if grapple line breaks', () => {
    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter1',
      pos: { x: 8, y: 10 },
      meta: {
        ...Encyclopaedia.unit('worm-hunter').meta,
        climbingLine: true,
        lineStart: { x: 5, y: 10 },
        lineEnd: { x: 12, y: 10 },
        climbProgress: 0.5,
        climbDirection: 1
      }
    };
    
    sim.addUnit(hunter);
    
    // No grappled unit at line end (line broken)
    ropeClimbing.apply();
    
    // Get the updated hunter from the sim roster
    const hunterAfter = sim.roster['hunter1'];
    
    // Should detach from broken line
    expect(hunterAfter?.meta.climbingLine).toBeUndefined();
  });
  
  it('should not climb own grapple lines', () => {
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler1',
      pos: { x: 5, y: 10 },
      meta: {
        canClimbGrapples: true // Give grappler climbing ability for test
      }
    };
    
    const target = {
      ...Encyclopaedia.unit('soldier'),
      id: 'target1',
      pos: { x: 10, y: 10 },
      team: 'hostile' as const,
      meta: {
        grappled: true,
        grappledBy: 'grappler1',
        tetherPoint: { x: 5, y: 10 },
        grappledDuration: 60
      }
    };
    
    sim.addUnit(grappler);
    sim.addUnit(target);
    
    // Create grappler's own line
    (grapplingPhysics as any).grappleLines.set('grappler1_target1', {
      grapplerID: 'grappler1',
      targetID: 'target1',
      startPos: { x: 5, y: 10 },
      endPos: { x: 10, y: 10 },
      length: 5,
      taut: true,
      pinned: false,
      duration: 60
    });
    
    grapplingPhysics.apply();
    ropeClimbing.apply();
    
    // Grappler should not climb their own line
    expect(grappler.meta.climbingLine).toBeUndefined();
  });
  
  it('should increase climb speed based on unit moveSpeed', () => {
    const fastHunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'fast1',
      pos: { x: 6, y: 10 },
      meta: {
        ...Encyclopaedia.unit('worm-hunter').meta,
        climbingLine: true,
        lineStart: { x: 5, y: 10 },
        lineEnd: { x: 15, y: 10 },
        climbProgress: 0.2,
        climbDirection: 1,
        moveSpeed: 2.0 // Faster than normal
      }
    };
    
    const slowHunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'slow1',
      pos: { x: 6, y: 12 },
      meta: {
        ...Encyclopaedia.unit('worm-hunter').meta,
        climbingLine: true,
        lineStart: { x: 5, y: 12 },
        lineEnd: { x: 15, y: 12 },
        climbProgress: 0.2,
        climbDirection: 1,
        moveSpeed: 0.5 // Slower than normal
      }
    };
    
    sim.addUnit(fastHunter);
    sim.addUnit(slowHunter);
    
    const fastInitialProgress = fastHunter.meta.climbProgress;
    const slowInitialProgress = slowHunter.meta.climbProgress;
    
    ropeClimbing.apply();
    
    // Get updated units from sim roster
    const fastHunterAfter = sim.roster['fast1'];
    const slowHunterAfter = sim.roster['slow1'];
    
    const fastProgressGain = (fastHunterAfter?.meta.climbProgress || 0) - fastInitialProgress;
    const slowProgressGain = (slowHunterAfter?.meta.climbProgress || 0) - slowInitialProgress;
    
    // Fast hunter should climb faster
    expect(fastProgressGain).toBeGreaterThan(slowProgressGain);
  });
});