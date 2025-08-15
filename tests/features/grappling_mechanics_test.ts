import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { ProjectileMotion } from '../../src/rules/projectile_motion';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';

describe('Grappling Mechanics - Core Physics', () => {
  it('should create a grapple projectile when grappler fires hook', () => {
    const sim = new Simulator();
    // Don't override rulebook - use default which includes all necessary rules
    
    // Create grappler unit
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {} // Clear cooldown
    };
    sim.addUnit(grappler);
    
    // Add enemy to target
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 10, y: 5 },
      team: 'hostile',
      hp: 50,
      sprite: 'soldier'
    });
    
    // Run Abilities to fire grapple
    sim.step(); // Abilities queues the grapple command
    sim.step(); // CommandHandler processes the grapple command
    
    // Should create grapple projectile
    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBeGreaterThan(0);
    
    if (grapples.length > 0) {
      const grapple = grapples[0];
      expect(grapple.sourceId || (grapple as any).grapplerID).toBe('grappler-1');
    }
  });

  it('should establish tether when grapple hits target unit', () => {
    const sim = new Simulator();
    // Don't override rulebook - use default which includes all necessary rules
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {}
    };
    
    const target = {
      ...Encyclopaedia.unit('soldier'),
      id: 'target-1',
      pos: { x: 8, y: 5 },
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler);
    sim.addUnit(target);
    
    // Fire grapple using Abilities
    sim.step(); // Abilities queues the grapple command
    
    // Check if a grapple projectile was created
    const grapplesAfterStep = sim.projectiles.filter(p => p.type === 'grapple');
    console.log('Grapple projectiles after first step:', grapplesAfterStep.length);
    
    sim.step(); // CommandHandler processes the grapple command
    
    // Process grapple projectile movement and collision
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      // Check if any unit has grappleHit flag
      const hitUnits = sim.units.filter(u => u.meta.grappleHit);
      if (hitUnits.length > 0) {
        console.log('Units with grappleHit:', hitUnits.map(u => u.id));
      }
      
      // Check if tether was established
      const g = sim.units.find(u => u.id === 'grappler-1');
      if (g?.meta.grapplingTarget === 'target-1') {
        console.log('Tether established at step', i);
        break;
      }
    }
    
    const finalGrappler = sim.units.find(u => u.id === 'grappler-1');
    expect(finalGrappler?.meta.grapplingTarget).toBe('target-1');
  });

  it('should damage and pin segments when grappling segmented creature', () => {
    const sim = new Simulator();
    // Use default rulebook which has all necessary rules
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {}
    };
    
    // Create segmented worm properly
    const worm = {
      ...Encyclopaedia.unit('big-worm'),
      id: 'worm-1',
      pos: { x: 8, y: 5 },
      team: 'hostile' as const,
      meta: { 
        segmented: true,
        segmentCount: 2
      }
    };
    
    sim.addUnit(grappler);
    sim.addUnit(worm);
    
    // Let SegmentedCreatures create the segments
    sim.step();
    
    // Find the first segment that was created
    const segment1 = sim.units.find(u => 
      u.meta?.segment && 
      u.meta?.parentId === 'worm-1' && 
      u.meta?.segmentIndex === 1
    );
    
    expect(segment1).toBeDefined();
    console.log('Segment initial hp:', segment1!.hp);
    console.log('Segment id:', segment1!.id);
    const initialSegmentHp = segment1!.hp;
    const segmentId = segment1!.id;
    
    // Use the actual grapple ability
    sim.forceAbility('grappler-1', 'grapplingHook', worm);
    
    // Process grapple - use debugging to track changes
    for (let i = 0; i < 20; i++) {
      // Track segment before step
      const segmentBefore = sim.units.find(u => u.id === segmentId);
      const wormBefore = sim.units.find(u => u.id === 'worm-1');
      
      sim.step();
      
      // Track segment after step
      const segmentAfter = sim.units.find(u => u.id === segmentId);
      const wormAfter = sim.units.find(u => u.id === 'worm-1');
      
      // Log deltas for first few steps and when damage occurs
      if (i < 3 || (segmentBefore && segmentAfter && segmentBefore.hp !== segmentAfter.hp)) {
        console.log(`\n=== Step ${i} ===`);
        if (segmentBefore && segmentAfter) {
          console.log(`Segment HP: ${segmentBefore.hp} -> ${segmentAfter.hp}`);
          console.log(`Segment pinned: ${segmentBefore.meta?.pinned} -> ${segmentAfter.meta?.pinned}`);
        }
        if (wormBefore && wormAfter) {
          console.log(`Worm grappleHit: ${wormBefore.meta?.grappleHit} -> ${wormAfter.meta?.grappleHit}`);
          console.log(`Worm grappled: ${wormBefore.meta?.grappled} -> ${wormAfter.meta?.grappled}`);
        }
      }
      
      if (!segmentAfter) {
        console.log(`\nSegment died at step ${i}, had ${segmentBefore?.hp} HP before death`);
        break;
      }
    }
    
    // Check if segment was damaged
    const finalSegment = sim.units.find(u => u.id === segmentId);
    expect(finalSegment).toBeDefined();
    expect(finalSegment!.hp).toBeLessThan(initialSegmentHp);
    expect(finalSegment!.meta?.pinned).toBe(true);
  });

  it('should limit grappler to maximum simultaneous grapples', () => {
    const sim = new Simulator();
    // Don't override rulebook - use default which includes all necessary rules
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      abilities: {
        grapplingHook: {
          ...Encyclopaedia.abilities.grapplingHook,
          config: { range: 10, maxGrapples: 2 },
          cooldown: 1 // Very short cooldown for testing
        }
      },
      lastAbilityTick: {}
    };
    
    sim.addUnit(grappler);
    
    // Add multiple targets
    for (let i = 0; i < 5; i++) {
      sim.addUnit({
        id: `target-${i}`,
        pos: { x: 8 + i, y: 5 },
        team: 'hostile' as const,
        hp: 50,
        sprite: 'soldier'
      });
    }
    
    // Fire multiple grapples
    for (let i = 0; i < 10; i++) {
      // Clear cooldown each time
      grappler.lastAbilityTick.grapplingHook = -100;
      sim.step();
    }
    
    // Count active grapples
    const grapples = sim.projectiles.filter(p => 
      p.type === 'grapple' && 
      (p.sourceId === 'grappler-1' || (p as any).grapplerID === 'grappler-1')
    );
    
    // Should not exceed maximum
    expect(grapples.length).toBeLessThanOrEqual(2);
  });
});