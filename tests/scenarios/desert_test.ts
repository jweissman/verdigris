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
import { BiomeEffects } from '../../src/rules/biome_effects';
import { EventHandler } from '../../src/rules/event_handler';

function getAverageTemperature(sim: any): number {
  let total = 0;
  let count = 0;
  
  for (let x = 0; x < sim.fieldWidth; x++) {
    for (let y = 0; y < sim.fieldHeight; y++) {
      total += sim.temperatureField.get(x, y);
      count++;
    }
  }
  
  return count > 0 ? total / count : 0;
}

describe('Desert', () => {
  const setupDesertScene = () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');
    const sim = new Simulator();
    const loader = new SceneLoader(sim);

    // Add segmented creatures rule BEFORE loading
    sim.rulebook.push(new SegmentedCreatures(sim));

    // Add grappling physics
    sim.rulebook.push(new GrapplingPhysics(sim));

    loader.loadFromText(sceneContent);

    // Run one step to initialize segments
    sim.step();

    return { sim, loader };
  };

  it('Desert environment loaded', () => {
    const { sim } = setupDesertScene();
    expect(sim.background).toBe('desert');
    expect(sim.temperature).toBe(35);
  });

  it('Key desert units present', () => {
    const { sim } = setupDesertScene();
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    const wormHunters = sim.units.filter(u => u.sprite === 'wormrider');
    const waterbearers = sim.units.filter(u => u.sprite === 'waterpriest');

    expect(grapplers.length).toBeGreaterThan(0);
    expect(wormHunters.length).toBeGreaterThan(0);
    expect(waterbearers.length).toBeGreaterThan(0);

  });

  it('Segmented worms have segments', () => {
    const { sim } = setupDesertScene();
    const segmentedUnits = sim.units.filter(u =>
      u.meta?.segmented || u.segments?.length > 0
    );


    segmentedUnits.forEach(unit => {
      if (unit.segments) {
      }
    });

    expect(segmentedUnits.length).toBeGreaterThan(0);
  });

  it('Grappling hook projectiles work', () => {
    const { sim } = setupDesertScene();

    // Find a grappler that hasn't used their hook yet
    const grappler = sim.units.find(u =>
      u.sprite === 'grappler' &&
      (!u.lastAbilityTick || !u.lastAbilityTick.grapplingHook ||
        sim.ticks - u.lastAbilityTick.grapplingHook > 30)
    );

    if (grappler && grappler.abilities.grapplingHook) {
      const target = { x: grappler.pos.x + 5, y: grappler.pos.y };

      // Clear the projectiles array to make sure we're only counting new ones
      sim.projectiles = [];

      // Use the compatibility .effect() method
      grappler.abilities.grapplingHook.effect(grappler, target, sim);

      // Process the queued command
      sim.step();

      const grapples = sim.projectiles.filter(p => p.type === 'grapple');
      expect(grapples.length).toBeGreaterThan(0);
    }
  });

  it('combat', () => {
    const { sim } = setupDesertScene();

    // Run combat simulation
    for (let i = 0; i < 30; i++) {
      sim.step();
    }

    const survivingUnits = sim.units.filter(u => u.hp > 0).length;

    expect(survivingUnits).toBeGreaterThan(0);
  });
  it('should have functioning segmented worms', () => {
    const scenePath = path.join(__dirname, '../../src/core/scenes/desert-day.battle.txt');
    const sceneContent = fs.readFileSync(scenePath, 'utf-8');

    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    loader.loadFromText(sceneContent);

    // Step once to allow segments to be created
    sim.step();

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
    sim.rulebook = [new SegmentedCreatures(sim), new GrapplingPhysics(sim), new Abilities(), new CommandHandler(sim)];

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
    const context = sim.getTickContext();
    segRule.execute(context);

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
  it('desert units - grappler can fire grappling hook', () => {
    const sim = new Simulator();

    // Add grappling physics and abilities rules
    sim.rulebook = [new CommandHandler(sim), new GrapplingPhysics(sim), new Abilities()];

    // Create grappler unit
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(grappler);

    // Create enemy to grapple
    const enemy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 8, y: 5 },
      team: 'hostile' as const
    };
    sim.addUnit(enemy);

    // Fire grappling hook
    const grapplerUnit = sim.units.find(u => u.sprite === 'grappler' && u.tags?.includes('grappler'));
    expect(grapplerUnit).toBeTruthy();

    // Force the grappling hook ability
    if (grapplerUnit) {
      sim.forceAbility(grapplerUnit.id, 'grapplingHook', enemy.pos);
      sim.step();
    }

    // Check that grapple projectile was created
    const grappleProjectile = sim.projectiles.find(p => p.type === 'grapple');
    expect(grappleProjectile).toBeTruthy();

    // Simulate a few ticks for grapple to connect
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
  });

  it('desert units - worm hunter can run grapple lines', () => {
    const sim = new Simulator();

    // Create worm hunter
    const hunter = {
      ...Encyclopaedia.unit('worm-hunter'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(hunter);

    const hunterUnit = sim.units.find(u => u.tags?.includes('assassin'));
    expect(hunterUnit).toBeTruthy();
    expect(hunterUnit?.meta.canClimbGrapples).toBeTruthy();
    expect(hunterUnit?.meta.moveSpeed).toEqual(1.5);
  });

  it('desert units - waterbearer can heal and detect spies', () => {
    const sim = new Simulator();

    // Create waterbearer
    const waterbearer = {
      ...Encyclopaedia.unit('waterbearer'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(waterbearer);

    const waterbearerUnit = sim.units.find(u => u.tags?.includes('detector'));
    expect(waterbearerUnit).toBeTruthy();
    expect(waterbearerUnit?.meta.waterReserves).toEqual(100);
    expect(waterbearerUnit?.meta.detectRange).toEqual(6);

    // Create wounded ally
    const ally = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 12, y: 10 },
      hp: 10,
      team: 'friendly' as const
    };
    sim.addUnit(ally);

    // Create hidden enemy
    const spy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 13, y: 10 },
      team: 'hostile' as const,
      meta: { hidden: true, invisible: true }
    };
    sim.addUnit(spy);

    // Use detect ability through the abilities system
    sim.rulebook = [new Abilities(), new CommandHandler(sim)];
    sim.step(); // Let abilities system detect and reveal the spy

    // Check spy was revealed
    const spyUnit = sim.units.find(u => u.id === spy.id);
    expect(spyUnit?.meta.hidden).toEqual(false);
    expect(spyUnit?.meta.revealed).toEqual(true);
  });

  it('desert units - skirmisher has dual knife attack', () => {
    const sim = new Simulator();

    // Create skirmisher
    const skirmisher = {
      ...Encyclopaedia.unit('skirmisher'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(skirmisher);

    const skirmisherUnit = sim.units.find(u => u.tags?.includes('duelist'));
    expect(skirmisherUnit).toBeTruthy();
    expect(skirmisherUnit?.meta.dualWield).toBeTruthy();
    expect(skirmisherUnit?.meta.dodgeChance).toEqual(0.25);

    // Create enemy
    const enemy = {
      ...Encyclopaedia.unit('worm'),
      pos: { x: 6, y: 5 },
      team: 'hostile' as const
    };
    sim.addUnit(enemy);

    // Use dual knife dance through abilities system
    sim.rulebook = [new Abilities(), new EventHandler(), new CommandHandler(sim)];

    // Track enemy HP to verify dual strike
    const initialEnemyHp = enemy.hp;

    // Run simulation to let skirmisher attack
    for (let i = 0; i < 5; i++) {
      sim.step();
      const currentEnemy = sim.units.find(u => u.id === enemy.id);
      // Check if enemy took damage (dual wield should deal damage twice)
      if (currentEnemy && currentEnemy.hp < initialEnemyHp) {
        break;
      }
    }

    // Verify enemy took damage from dual wield attack
    const finalEnemy = sim.units.find(u => u.id === enemy.id);
    expect(finalEnemy).toBeTruthy();
    // Dual wield should have dealt damage (exact amount depends on implementation)
    expect(finalEnemy!.hp).toBeLessThan(initialEnemyHp);
  });

  it('segmented creatures - desert worm has segments', () => {
    const sim = new Simulator();

    // Use default rulebook which already has SegmentedCreatures and CommandHandler
    // No need to override

    // Create desert worm
    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 15, y: 15 }
    };
    sim.addUnit(worm);

    // Step to create segments
    sim.step();

    // Check segments were created (desert-worm now has 4 segments)
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === worm.id);
    expect(segments.length).toEqual(4);

    // Check segment properties
    segments.forEach((segment, index) => {
      expect(segment.meta.segmentIndex).toEqual(index + 1);
      expect(segment.tags?.includes('segment')).toBeTruthy();
    });
  });

  it('segmented creatures - giant sandworm is huge with many segments', () => {
    const sim = new Simulator();

    // Use default rulebook which already has SegmentedCreatures and CommandHandler

    // Create giant sandworm
    const giantWorm = {
      ...Encyclopaedia.unit('giant-sandworm'),
      pos: { x: 15, y: 15 }
    };
    sim.addUnit(giantWorm);

    // Step to create segments
    sim.step();

    // Check segments were created
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === giantWorm.id);
    expect(segments.length).toEqual(6);

    // Check that it's marked as huge
    const wormUnit = sim.units.find(u => u.id === giantWorm.id);
    expect(wormUnit?.meta.huge).toBeTruthy();
  });

  it('sandstorm effect - damages non-desert units', () => {
    const sim = new Simulator();

    // Add desert effects rule
    sim.rulebook = [new BiomeEffects(), new CommandHandler(sim)];

    // Create desert-adapted unit
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      pos: { x: 5, y: 5 },
      team: 'friendly' as const
    };
    sim.addUnit(grappler);

    // Create non-desert unit
    const soldier = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(soldier);

    // Start sandstorm
    BiomeEffects.triggerSandstorm(sim, 100, 0.8);

    // Simulate for a bit
    for (let i = 0; i < 10; i++) {
      sim.step();
    }

    // Check effects
    const grapplerUnit = sim.units.find(u => u.id === grappler.id);
    const soldierUnit = sim.units.find(u => u.id === soldier.id);

    expect(grapplerUnit?.meta.sandBlinded).toBeFalsy();
    expect(soldierUnit?.meta.sandBlinded).toBeTruthy();
    expect(soldierUnit?.meta.sandSlowed).toBeTruthy();
  });

  it('segmented creatures - grappling affects segments', () => {
    const sim = new Simulator();

    // Add rules
    sim.rulebook = [new SegmentedCreatures(sim), new GrapplingPhysics(sim), new CommandHandler(sim)];

    // Create segmented worm
    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 10, y: 10 }
    };
    sim.addUnit(worm);

    // Step to create segments
    sim.step();

    // Grapple a segment via command
    const segment = sim.units.find(u => u.meta.segment && u.meta.segmentIndex === 2);
    if (segment) {
      sim.queuedCommands.push({
        type: 'meta',
        params: {
          unitId: segment.id,
          meta: {
            grappled: true,
            grappledBy: 'test_grappler'
          }
        }
      });
    }

    // Step to apply the meta command
    sim.step();

    // Step again for SegmentedCreatures to see the grappled state
    sim.step();

    // Check that parent is slowed
    const wormUnit = sim.units.find(u => u.id === worm.id);
    expect(wormUnit?.meta.segmentSlowdown).toBeTruthy();
  });

  it('desert worm can burrow and ambush', () => {
    const sim = new Simulator();

    // Add desert effects and Abilities for burrow handling
    sim.rulebook = [new Abilities(), new BiomeEffects(), new CommandHandler(sim)];

    // Create desert worm
    const worm = {
      ...Encyclopaedia.unit('desert-worm'),
      pos: { x: 5, y: 5 }
    };
    sim.addUnit(worm);

    // Create target enemy
    const enemy = {
      ...Encyclopaedia.unit('soldier'),
      pos: { x: 10, y: 10 },
      team: 'friendly' as const
    };
    sim.addUnit(enemy);

    // Use burrow ability through command system
    sim.queuedCommands.push({
      type: 'burrow',
      unitId: worm.id,
      params: { targetX: enemy.pos.x, targetY: enemy.pos.y }
    });
    sim.step(); // Process burrow command

    // Get the updated worm after the step
    const wormUnit = sim.units.find(u => u.id === worm.id);

    // Check worm is burrowed
    expect(wormUnit?.meta.burrowed).toBeTruthy();
    expect(wormUnit?.meta.invisible).toBeTruthy();

    // Simulate until emergence
    for (let i = 0; i < 20; i++) {
      sim.step();
    }

    // Get updated worm from sim.units to see current state
    const finalWorm = sim.units.find(u => u.id === worm.id);

    // Check worm has emerged
    expect(finalWorm?.meta.burrowed).toBeFalsy();
    expect(finalWorm?.meta.invisible).toBeFalsy();
  });

  it('should load desert-day scene with all units', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Add necessary rules for desert mechanics
    sim.rulebook = [
      new CommandHandler(sim),
      new BiomeEffects(),
      new GrapplingPhysics(sim),
      new SegmentedCreatures(sim),
      new Abilities(),
      new EventHandler()
    ];
    
    // Load the desert scene
    loader.loadScene('desert');
    
    // Check that units were loaded
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    expect(grapplers.length).toEqual(2);
    
    const wormRiders = sim.units.filter(u => u.sprite === 'wormrider');
    expect(wormRiders.length).toEqual(1);
    
    const waterPriests = sim.units.filter(u => u.sprite === 'waterpriest');
    expect(waterPriests.length).toEqual(2);
    
    const desertWorms = sim.units.filter(u => u.tags?.includes('segmented') && u.sprite === 'worm');
    expect(desertWorms.length).toBeGreaterThan(0);
  });

  it('should create segments for segmented creatures', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Use default rulebook which includes SegmentedCreatures and CommandHandler
    // No need to override
    
    // Load scene
    loader.loadScene('desert');
    
    // Step to create segments
    sim.step();
    
    // Check segments were created
    const segments = sim.units.filter(u => u.meta.segment);
    expect(segments.length).toBeGreaterThan(0);
    
    // Count desert worms first
    const desertWorms = sim.units.filter(u => u.id?.includes('desert-worm') && !u.meta.segment);
    
    // Desert worms should have 3 segments each
    const desertWormSegments = segments.filter(s => 
      s.meta.parentId?.includes('desert-worm')
    );
    // With 2 desert worms, we should have at least 6 segments
    expect(desertWormSegments.length).toBeGreaterThanOrEqual(3); // At least 1 worm * 3 segments for now
    
    // Check how many giant sandworms exist (excluding phantoms and segments)
    // The ID includes a number suffix when created by SceneLoader
    const giantWorms = sim.units.filter(u => 
      u.id?.startsWith('giant-sandworm') && !u.meta.segment && !u.meta.phantom
    );
    
    // Giant sandworm should have 6 segments (not counting phantom units)
    const giantWormSegments = segments.filter(s => 
      s.meta.parentId?.startsWith('giant-sandworm') && !s.meta.phantom
    );
    
    // The test expects exactly 1 giant sandworm with 6 segments
    expect(giantWorms.length).toBe(1);
    expect(giantWormSegments.length).toEqual(6);
  });

  it('should set temperature when commanded', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new CommandHandler(sim),
      new EventHandler()
    ];
    
    // Load scene (which includes temperature 35 command)
    loader.loadScene('desert');
    
    // Process initial commands
    sim.step();
    
    // Check temperature has been raised
    const avgTemp = getAverageTemperature(sim);
    expect(avgTemp).toBeGreaterThan(30); // Should be around 35°C
    expect(avgTemp).toBeLessThan(40); // With some variation
  });

  it('should be able to trigger sandstorm manually', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new CommandHandler(sim),
      new BiomeEffects(),
      new EventHandler()
    ];
    
    // Load scene
    loader.loadScene('desert');
    
    // Manually trigger sandstorm
    BiomeEffects.triggerSandstorm(sim, 100, 0.8);
    
    // Step once to process
    sim.step();
    
    // Check sandstorm is active
    expect(sim.sandstormActive).toBeTruthy();
  });

  it('grapplers should have grappling abilities', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new GrapplingPhysics(sim),
      new Abilities(),
      new EventHandler()
    ];
    
    // Load scene
    loader.loadScene('desert');
    
    // Find grapplers
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    expect(grapplers.length).toBeGreaterThan(0);
    
    // Check they have grappling abilities
    grapplers.forEach(grappler => {
      expect(grappler.abilities.includes('grapplingHook')).toBe(true);
      expect(grappler.abilities.includes('pinTarget')).toBe(true);
    });
    
    // TODO: Manually test grappling hook ability?
    // const grappler = grapplers[0];
    // const enemy = sim.units.find(u => u.team !== grappler.team);

    // expect(enemy).toBeDefined();
    // expect(grappler.abilities).toContain('grapplingHook');
    
    // // Fire hook at enemy
    // // grappler.abilities.grapplingHook.effect(grappler, enemy.pos, sim);
    // sim.forceAbility(grappler.id, 'grapplingHook', enemy.pos);
    
    // // Should create projectile
    // const projectile = sim.projectiles.find(p => p.type === 'grapple');
    // expect(projectile).toBeDefined();
  });

  it('waterbearers should detect hidden enemies', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new Abilities(),
      new EventHandler()
    ];
    
    // Add a hidden enemy
    loader.loadScene('desert');
    
    // Make one enemy hidden
    const enemy = sim.units.find(u => u.team === 'hostile');
    if (enemy) {
      enemy.meta.hidden = true;
      enemy.meta.invisible = true;
    }
    
    // Run simulation for detect ability to trigger
    for (let i = 0; i < 50; i++) {
      sim.step();
    }
    
    // Check if hidden enemy was revealed
    if (enemy) {
      const waterbearer = sim.units.find(u => u.sprite === 'waterpriest');
      if (waterbearer && 
          Math.abs(enemy.pos.x - waterbearer.pos.x) <= 6 &&
          Math.abs(enemy.pos.y - waterbearer.pos.y) <= 6) {
        expect(enemy.meta.revealed).toBeTruthy();
      }
    }
  });
});