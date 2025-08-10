import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { Abilities } from '../../src/rules/abilities';
import { CommandHandler } from '../../src/rules/command_handler';
import { ProjectileMotion } from '../../src/rules/projectile_motion';

describe('Grappling Mechanics - Core Physics', () => {
  it('should create a grapple projectile when grappler fires hook', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new ProjectileMotion(sim), new GrapplingPhysics(sim)];
    
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
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new ProjectileMotion(sim), new GrapplingPhysics(sim)];
    
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
    sim.step(); // CommandHandler processes the grapple command
    
    // Process grapple projectile movement and collision
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      // Check if tether was established
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
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new ProjectileMotion(sim), new GrapplingPhysics(sim)];
    
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      lastAbilityTick: {}
    };
    
    // Create segmented worm with segments
    const worm = {
      ...Encyclopaedia.unit('big-worm'),
      id: 'worm-1',
      pos: { x: 8, y: 5 },
      team: 'hostile' as const,
      meta: { segmented: true },
      segments: [
        { id: 'segment-1', hp: 20, maxHp: 20, pos: { x: 9, y: 5 } },
        { id: 'segment-2', hp: 20, maxHp: 20, pos: { x: 10, y: 5 } }
      ]
    };
    
    sim.addUnit(grappler);
    sim.addUnit(worm);
    
    const initialSegmentHp = worm.segments[0].hp;
    
    // Fire grapple using Abilities
    sim.step(); // Abilities queues the grapple command
    sim.step(); // CommandHandler processes the grapple command
    
    // Process grapple hit
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      // Check if segment was damaged
      const w = sim.units.find(u => u.id === 'worm-1');
      if (w?.segments && w.segments[0].hp < initialSegmentHp) {
        break;
      }
    }
    
    const finalWorm = sim.units.find(u => u.id === 'worm-1');
    expect(finalWorm?.segments?.[0].hp).toBeLessThan(initialSegmentHp);
  });

  it('should limit grappler to maximum simultaneous grapples', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new ProjectileMotion(sim), new GrapplingPhysics(sim)];
    
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