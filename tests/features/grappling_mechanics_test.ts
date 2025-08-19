import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/core/command_handler';
import { ProjectileMotion } from '../../src/rules/projectile_motion';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';

describe('Grappling Mechanics - Core Physics', () => {
  it('should create a grapple projectile when grappler fires hook', () => {
    const sim = new Simulator();

    

    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {} // Clear cooldown
    };
    sim.addUnit(grappler);
    

    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 10, y: 5 },
      team: 'hostile',
      hp: 50,
      sprite: 'soldier'
    });
    

    sim.step(); // Abilities queues the grapple command
    sim.step(); // CommandHandler processes the grapple command
    

    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBeGreaterThan(0);
    
    if (grapples.length > 0) {
      const grapple = grapples[0];
      expect(grapple.sourceId || (grapple as any).grapplerID).toBe('grappler-1');
    }
  });

  it('should establish tether when grapple hits target unit', () => {
    const sim = new Simulator();
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
    sim.step(); // Abilities queues the grapple command
    sim.step(); // CommandHandler processes the grapple command
    for (let i = 0; i < 20; i++) {
      sim.step();
      const g = sim.units.find(u => u.id === 'grappler-1');
      if (g?.meta.grapplingTarget === 'target-1') {
        break;
      }
    }
    
    const finalGrappler = sim.units.find(u => u.id === 'grappler-1');
    expect(finalGrappler?.meta.grapplingTarget).toBe('target-1');
  });

  it('should damage and pin segments when grappling segmented creature', () => {
    const sim = new Simulator();
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {}
    };
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
    sim.step();
    const segment1 = sim.units.find(u => 
      u.meta?.segment && 
      u.meta?.parentId === 'worm-1' && 
      u.meta?.segmentIndex === 1
    );
    expect(segment1).toBeDefined();
    const initialSegmentHp = segment1!.hp;
    const segmentId = segment1!.id;
    sim.forceAbility('grappler-1', 'grapplingHook', worm);
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    const finalSegment = sim.units.find(u => u.id === segmentId);
    expect(finalSegment).toBeDefined();
    expect(finalSegment!.hp).toBeLessThan(initialSegmentHp);
    expect(finalSegment!.meta?.pinned).toBe(true);
  });

  it('should limit grappler to maximum simultaneous grapples', () => {
    const sim = new Simulator();

    
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
    

    for (let i = 0; i < 5; i++) {
      sim.addUnit({
        id: `target-${i}`,
        pos: { x: 8 + i, y: 5 },
        team: 'hostile' as const,
        hp: 50,
        sprite: 'soldier'
      });
    }
    

    for (let i = 0; i < 10; i++) {

      grappler.lastAbilityTick.grapplingHook = -100;
      sim.step();
    }
    

    const grapples = sim.projectiles.filter(p => 
      p.type === 'grapple' && 
      (p.sourceId === 'grappler-1' || (p as any).grapplerID === 'grappler-1')
    );
    

    expect(grapples.length).toBeLessThanOrEqual(2);
  });
});