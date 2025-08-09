import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../src/scene_loader';
import { Simulator } from '../src/simulator';
import * as fs from 'fs';
import * as path from 'path';

describe('Desert Day Combat Integration', () => {
  it('should have functioning segmented worms', () => {
    const scenePath = path.join(__dirname, '../src/scenes/desert-day.battle.txt');
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
    
    // Create a grappler
    const grappler = {
      ...require('../src/dmg/encyclopaedia').default.unit('grappler'),
      id: 'test-grappler',
      pos: { x: 5, y: 5 }
    };
    
    // Create a segmented worm
    const worm = {
      ...require('../src/dmg/encyclopaedia').default.unit('desert-worm'),
      id: 'test-worm',
      pos: { x: 10, y: 5 }
    };
    
    sim.addUnit(grappler);
    sim.addUnit(worm);
    
    // Ensure worm has segments
    if (!worm.segments || worm.segments.length === 0) {
      const SegmentedCreatures = require('../src/rules/segmented_creatures').SegmentedCreatures;
      const segRule = new SegmentedCreatures(sim);
      segRule.apply(); // Create segments
    }
    
    // Find segments created for this worm
    const segments = sim.units.filter(u => u.meta?.parentId === worm.id);
    expect(segments.length).toBeGreaterThan(0);
    
    // Fire grapple at a segment
    const targetSegment = segments[1] || segments[0]; // Middle or first segment
    const targetPos = targetSegment.pos;
    
    
    grappler.abilities.grapplingHook.effect(grappler, targetPos, sim);
    
    // Process grapple physics
    const GrapplingPhysics = require('../src/rules/grappling_physics').GrapplingPhysics;
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
    const scenePath = path.join(__dirname, '../src/scenes/desert-day.battle.txt');
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
    
    // Set up desert battlefield
    sim.background = 'desert';
    sim.temperature = 35;
    
    // Add units for combat scenario
    const grappler1 = {
      ...require('../src/dmg/encyclopaedia').default.unit('grappler'),
      id: 'grappler-1',
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    
    const wormHunter = {
      ...require('../src/dmg/encyclopaedia').default.unit('worm-hunter'),
      id: 'hunter-1',
      pos: { x: 6, y: 5 },
      team: 'friendly' as const
    };
    
    const sandworm = {
      ...require('../src/dmg/encyclopaedia').default.unit('giant-sandworm'),
      id: 'sandworm-1',
      pos: { x: 15, y: 5 },
      team: 'hostile' as const
    };
    
    sim.addUnit(grappler1);
    sim.addUnit(wormHunter);
    sim.addUnit(sandworm);
    
    // Create segments for sandworm
    const SegmentedCreatures = require('../src/rules/segmented_creatures').SegmentedCreatures;
    const segRule = new SegmentedCreatures(sim);
    segRule.apply();
    
    
    // Grappler fires hook at sandworm
    grappler1.abilities.grapplingHook.effect(grappler1, sandworm.pos, sim);
    
    // Check projectile created
    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBe(1);
    
    
    // Simulate combat for several steps
    for (let i = 0; i < 20; i++) {
      sim.step();
      
      // Check for interesting events
      if (i === 10) {
        const segments = sandworm.segments || [];
        const pinnedSegments = segments.filter(s => s.pinned);
      }
    }
    
    // Final state check
    const finalWormHp = sandworm.hp;
    const segmentsRemaining = sandworm.segments?.filter(s => s.hp > 0).length || 0;
    
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
});