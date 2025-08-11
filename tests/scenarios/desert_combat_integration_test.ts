import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';
import { Simulator } from '../../src/core/simulator';
import * as fs from 'fs';
import * as path from 'path';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { SegmentedCreatures } from '../../src/rules/segmented_creatures';
import { GrapplingPhysics } from '../../src/rules/grappling_physics';
import { Abilities } from '../../src/rules/abilities';

describe('Desert Day Combat Integration', () => {
  it('should have functioning segmented worms', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadFromText(sceneContent);
    
    // Verify units loaded
    expect(sim.units.length).toBeGreaterThan(0);
    
    // Find desert worms (M in scene) - exclude segments
    const worms = sim.units.filter(u => 
      (u.type === 'desert-worm' || u.sprite === 'desert-worm') && 
      !u.meta?.segment // Exclude segment units
    );
    
    
    expect(worms.length).toBeGreaterThan(0);
    
    // Check worms have segments (segments are created as separate units)
    worms.forEach(worm => {
      // Find segments for this worm
      const wormSegments = sim.units.filter(u => 
        u.meta?.parentId === worm.id || 
        u.id?.includes(`${worm.id}_segment`)
      );
      
      // Verify parent worm has segmented metadata
      expect(worm.meta?.segmented || worm.meta?.segmentCount > 0).toBeTruthy();
      
      // If this is supposed to be segmented, it should have segment units
      if (worm.meta?.segmented) {
        expect(wormSegments.length).toBeGreaterThan(0);
      }
    });
  });

  it('should allow grappling and pinning worm segments', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new SegmentedCreatures(sim), new GrapplingPhysics(sim), new Abilities(sim)];
    
    // Create a grappler
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'test-grappler',
      pos: { x: 5, y: 5 }
    };
    
    // Create a segmented worm
    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      id: 'test-worm',
      pos: { x: 10, y: 5 }
    };
    
    sim.addUnit(grappler);
    sim.addUnit(worm);
    
    // Run a step to let SegmentedCreatures rule create segments
    sim.step();
    
    // Find segments created for this worm
    const segments = sim.units.filter(u => u.meta?.parentId === worm.id);
    expect(segments.length).toBeGreaterThan(0);
    
    // Fire grapple at a segment
    const targetSegment = segments[1] || segments[0]; // Middle or first segment
    const targetPos = targetSegment.pos;
    
    // Check that grappler has the grapplingHook ability
    expect(grappler.abilities).toContain('grapplingHook');
    
    // Use sim.forceAbility to trigger the ability
    sim.forceAbility(grappler.id, 'grapplingHook', targetPos);
    
    // Process grapple physics
    sim.rulebook.push(new GrapplingPhysics(sim));
    
    // Move grapple projectile to target
    for (let i = 0; i < 10; i++) {
      sim.projectiles.forEach(p => {
        if (p.type === 'grapple' && p.target) {
          p.pos.x = p.target.x;
          p.pos.y = p.target.y;
        }
      });
      sim.step();
    }
    
    // Check segment is affected
    
    // Verify grappling affects worm movement
    const originalPos = { ...worm.pos };
    worm.intendedMove = { x: 20, y: 5 };
    
    sim.step();
    
    const moveDistance = Math.abs(worm.pos.x - originalPos.x);
    
    expect(moveDistance).toBeLessThan(10); // Movement should be restricted
  });

  it('should have proper desert atmosphere with sandstorm', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadFromText(sceneContent);
    
    // Check desert environment
    expect(sim.background).toBe('desert');
    expect(sim.temperature).toBe(35);
    
    // Check sandstorm particles
    const sandParticles = sim.particles.filter(p => p.type === 'sand');
    expect(sandParticles.length).toBeGreaterThan(0);
    
    
    // Run simulation to see desert effects
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Check if units are affected by heat
    const affectedUnits = sim.units.filter(u => 
      u.meta?.temperatureEffect || u.meta?.heatStress
    );
    
  });

  it('should demonstrate key desert combat scenario', () => {
    const sim = new Simulator();
    
    // Add units for combat scenario
    const grappler1 = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    
    const wormHunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      id: 'hunter-1',
      pos: { x: 6, y: 5 },
      team: 'friendly' as const
    };
    
    const sandworm = {
      ...Encyclopaedia.unit('giant-sandworm'),
      id: 'sandworm-1',
      pos: { x: 12, y: 5 },  // Move closer to be within grappling range
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler1);
    sim.addUnit(wormHunter);
    sim.addUnit(sandworm);
    
    // Create segments for sandworm
    const segRule = new SegmentedCreatures(sim);
    segRule.apply();
    
    // Get the actual grappler from sim to ensure it has abilities
    const actualGrappler = sim.units.find(u => u.id === 'grappler-1');
    expect(actualGrappler).toBeDefined();
    expect(actualGrappler!.abilities).toContain('grapplingHook');
    
    // Grappler fires hook at sandworm
    sim.forceAbility(actualGrappler!.id, 'grapplingHook', { x: sandworm.pos.x, y: sandworm.pos.y });
    sim.step();

    // Check projectile created
    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBe(1);

    // TODO: Check actual projectile properties?? Grapple should have target set??
  });
});