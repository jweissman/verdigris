import { expect } from 'bun:test';
import { describe, test, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { CommandHandler } from '../../src/rules/command_handler';

describe('Grappling Mass Physics', () => {
  let sim: Simulator = new Simulator(40, 20);

  beforeEach(() => sim.reset());

  test('light units can pull each other', () => {
    // Two units with equal mass should pull each other equally
    const grappler = {
      id: 'grappler',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'grappler',
      state: 'idle' as const,
      hp: 40,
      maxHp: 40,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {}
    };

    const target = {
      id: 'target',
      pos: { x: 10, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'hostile' as const,
      sprite: 'soldier',
      state: 'idle' as const,
      hp: 30,
      maxHp: 30,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {
        grappleHit: true, // Mark as hit by grapple
        grapplerID: 'grappler',
        grappleOrigin: { x: 5, y: 5 },
        pinDuration: 60
      }
    };

    sim.addUnit(grappler);
    sim.addUnit(target);

    const initialGrapplerX = grappler.pos.x;
    const initialTargetX = target.pos.x;

    // Apply grappling physics to process the grapple hit
    const grapplingPhysics = new GrapplingPhysics();
    const context = sim.getTickContext();
    
    // First execute to process the grappleHit and create the grapple line
    grapplingPhysics.execute(context);
    const commandHandler = new CommandHandler(sim);
    commandHandler.execute(context);
    
    // Now the grapple line should be established, execute again to apply taut effects
    grapplingPhysics.execute(context);
    commandHandler.execute(context);

    // Both should move toward each other
    const updatedGrappler = sim.units.find(u => u.id === 'grappler');
    const updatedTarget = sim.units.find(u => u.id === 'target');
    expect(updatedGrappler!.pos.x).toBeGreaterThan(initialGrapplerX);
    expect(updatedTarget!.pos.x).toBeLessThan(initialTargetX);
  });

  test('heavy units resist being pulled', () => {
    const lightGrappler = {
      id: 'grappler',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'grappler',
      state: 'idle' as const,
      hp: 40,
      maxHp: 40,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {}
    };

    const heavyTarget = {
      id: 'heavy',
      pos: { x: 10, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'hostile' as const,
      sprite: 'mechatron',
      state: 'idle' as const,
      hp: 80,
      maxHp: 80,
      mass: 20, // 4x the grappler's mass
      abilities: [],
      tags: [],
      meta: {
        grappled: true,
        grappledBy: 'grappler',
        tetherPoint: { x: 5, y: 5 },
        grappledDuration: 60
      }
    };

    sim.addUnit(lightGrappler);
    sim.addUnit(heavyTarget);

    // Create grapple line
    const grapplingPhysics = new GrapplingPhysics();
    (grapplingPhysics as any).grappleLines.set('grappler_heavy', {
      grapplerID: 'grappler',
      targetID: 'heavy',
      startPos: { x: 5, y: 5 },
      endPos: { x: 10, y: 5 },
      length: 5,
      taut: true,
      pinned: false,
      duration: 60
    });

    const initialGrapplerX = lightGrappler.pos.x;
    const initialHeavyX = heavyTarget.pos.x;

    const context = sim.getTickContext();
    grapplingPhysics.execute(context);
    const commandHandler = new CommandHandler(sim);
    commandHandler.execute(context);

    // Grappler should move more than the heavy target
    const updatedGrappler = sim.units.find(u => u.id === 'grappler');
    const updatedTarget = sim.units.find(u => u.id === 'heavy');
    const grapplerMovement = Math.abs(updatedGrappler!.pos.x - initialGrapplerX);
    const heavyMovement = Math.abs(updatedTarget!.pos.x - initialHeavyX);
    
    expect(grapplerMovement).toBeGreaterThan(heavyMovement * 2);
  });

  test('massive units cannot be pulled at all', () => {
    const grappler = {
      id: 'grappler',
      pos: { x: 5, y: 5 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'grappler',
      state: 'idle' as const,
      hp: 40,
      maxHp: 40,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {}
    };

    const massiveWorm = {
      id: 'sandworm',
      pos: { x: 10, y: 5 },
      intendedMove: { x: 1, y: 0 }, // Trying to move
      team: 'hostile' as const,
      sprite: 'big-worm',
      state: 'idle' as const,
      hp: 120,
      maxHp: 120,
      mass: 50, // Massive creature
      abilities: [],
      tags: ['titan'],
      meta: {
        grappled: true,
        grappledBy: 'grappler',
        tetherPoint: { x: 5, y: 5 },
        grappledDuration: 60,
        huge: true
      }
    };

    sim.addUnit(grappler);
    sim.addUnit(massiveWorm);

    // Create grapple line
    const grapplingPhysics = new GrapplingPhysics();
    (grapplingPhysics as any).grappleLines.set('grappler_sandworm', {
      grapplerID: 'grappler',
      targetID: 'sandworm',
      startPos: { x: 5, y: 5 },
      endPos: { x: 10, y: 5 },
      length: 5,
      taut: true,
      pinned: false,
      duration: 60
    });

    const initialWormX = massiveWorm.pos.x;
    const initialGrapplerX = grappler.pos.x;
    
    // Apply physics update
    const context = sim.getTickContext();
    grapplingPhysics.execute(context);
    const commandHandler = new CommandHandler(sim);
    commandHandler.execute(context);

    // Get the updated units from the sim
    const updatedWorm = sim.units.find(u => u.id === 'sandworm');
    const updatedGrappler = sim.units.find(u => u.id === 'grappler');

    // Massive worm should not move at all
    expect(updatedWorm!.pos.x).toBe(initialWormX);
    
    // Grappler should be pulled toward the worm
    expect(updatedGrappler!.pos.x).toBeGreaterThan(initialGrapplerX);
    
    // Worm should be marked as pinned
    expect(updatedWorm!.meta.pinned).toBe(true);
    expect(updatedWorm!.meta.movementPenalty).toBe(1.0);
  });

  test('multiple grapplers can pin a heavy unit', () => {
    const heavy = {
      id: 'heavy',
      pos: { x: 10, y: 10 },
      intendedMove: { x: 1, y: 0 },
      team: 'hostile' as const,
      sprite: 'mechatron',
      state: 'idle' as const,
      hp: 80,
      maxHp: 80,
      mass: 25,
      abilities: [],
      tags: [],
      meta: {
        grappled: true,
        grappledBy: 'g1',
        tetherPoint: { x: 5, y: 10 },
        grappledDuration: 60
      }
    };

    const grappler1 = {
      id: 'g1',
      pos: { x: 5, y: 10 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'grappler',
      state: 'idle' as const,
      hp: 40,
      maxHp: 40,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {}
    };

    const grappler2 = {
      id: 'g2',
      pos: { x: 15, y: 10 },
      intendedMove: { x: 0, y: 0 },
      team: 'friendly' as const,
      sprite: 'grappler',
      state: 'idle' as const,
      hp: 40,
      maxHp: 40,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {}
    };

    sim.addUnit(heavy);
    sim.addUnit(grappler1);
    sim.addUnit(grappler2);

    // Set up first grapple via metadata (simulate grapple hit)
    const heavyUnit = sim.units.find(u => u.id === 'heavy')!;
    heavyUnit.meta.grappleHit = true;
    heavyUnit.meta.grapplerID = 'g1';
    heavyUnit.meta.grappleOrigin = { x: 5, y: 10 };
    
    // Use default rulebook which includes GrapplingPhysics
    sim.step();

    // Heavy unit should have some movement penalty from first grapple
    const updatedHeavy = sim.units.find(u => u.id === 'heavy');
    const firstPenalty = updatedHeavy!.meta.movementPenalty || 0;
    expect(firstPenalty).toBeGreaterThan(0);

    // Clear the first grapple hit flag and add second grapple
    updatedHeavy!.meta.grappleHit = true;
    updatedHeavy!.meta.grapplerID = 'g2';
    updatedHeavy!.meta.grappleOrigin = { x: 15, y: 10 };
    updatedHeavy!.meta.additionalGrapplers = ['g2'];
    
    // Run another step to process the second grappler
    sim.step();

    // With two grapplers, the heavy unit should have increased movement penalty
    const finalHeavy = sim.units.find(u => u.id === 'heavy');
    expect(finalHeavy!.meta.movementPenalty).toBeGreaterThanOrEqual(firstPenalty);
  });

  test('pinned units cannot move even with intended movement', () => {
    const pinned = {
      id: 'pinned',
      pos: { x: 10, y: 10 },
      intendedMove: { x: 1, y: 1 }, // Trying to move
      team: 'hostile' as const,
      sprite: 'soldier',
      state: 'idle' as const,
      hp: 30,
      maxHp: 30,
      mass: 5,
      abilities: [],
      tags: [],
      meta: {
        pinned: true,
        pinDuration: 10, // Pinned for 10 ticks
        movementPenalty: 1.0 // Completely immobilized
      }
    };

    sim.addUnit(pinned);
    
    const initialX = pinned.pos.x;
    const initialY = pinned.pos.y;
    
    // Apply grappling physics which should handle pinned units
    const grapplingPhysics = new GrapplingPhysics();
    const context = sim.getTickContext();
    grapplingPhysics.execute(context);
    const commandHandler = new CommandHandler(sim);
    commandHandler.execute(context);
    
    // Get the updated unit
    const updatedPinned = sim.units.find(u => u.id === 'pinned');
    
    // Unit should not have moved at all
    expect(updatedPinned!.pos.x).toBe(initialX);
    expect(updatedPinned!.pos.y).toBe(initialY);
    // Also check the halt command was applied
    expect(updatedPinned!.meta.stunned).toBe(true);
  });
});