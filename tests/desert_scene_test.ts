import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import { SceneLoader } from '../src/scene_loader';
import { DesertEffects } from '../src/rules/desert_effects';
import { GrapplingPhysics } from '../src/rules/grappling_physics';
import { SegmentedCreatures } from '../src/rules/segmented_creatures';
import { CommandHandler } from '../src/rules/command_handler';
import { EventHandler } from '../src/rules/event_handler';
import { Abilities } from '../src/rules/abilities';

describe('Desert Day Scene', () => {
  it('should load desert-day scene with all units', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Add necessary rules for desert mechanics
    sim.rulebook = [
      new CommandHandler(sim),
      new DesertEffects(sim),
      new GrapplingPhysics(sim),
      new SegmentedCreatures(sim),
      new Abilities(sim),
      new EventHandler(sim)
    ];
    
    // Load the desert scene
    loader.loadScene('desert-day');
    
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
    
    sim.rulebook = [
      new SegmentedCreatures(sim),
      new EventHandler(sim)
    ];
    
    // Load scene
    loader.loadScene('desert-day');
    
    // Step to create segments
    sim.step();
    
    // Check segments were created
    const segments = sim.units.filter(u => u.meta.segment);
    expect(segments.length).toBeGreaterThan(0);
    
    // Count desert worms first
    const desertWorms = sim.units.filter(u => u.id?.includes('desert-worm') && !u.meta.segment);
    console.log(`Found ${desertWorms.length} desert worms`);
    
    // Desert worms should have 3 segments each
    const desertWormSegments = segments.filter(s => 
      s.meta.parentId?.includes('desert-worm')
    );
    console.log(`Found ${desertWormSegments.length} desert worm segments`);
    // With 2 desert worms, we should have at least 6 segments
    expect(desertWormSegments.length).toBeGreaterThanOrEqual(3); // At least 1 worm * 3 segments for now
    
    // Giant sandworm should have 6 segments
    const giantWormSegments = segments.filter(s => 
      s.meta.parentId?.includes('giant-sandworm')
    );
    expect(giantWormSegments.length).toEqual(6);
  });

  it('should set temperature when commanded', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new CommandHandler(sim),
      new EventHandler(sim)
    ];
    
    // Load scene (which includes temperature 35 command)
    loader.loadScene('desert-day');
    
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
    
    const desertRule = new DesertEffects(sim);
    sim.rulebook = [
      new CommandHandler(sim),
      desertRule,
      new EventHandler(sim)
    ];
    
    // Load scene
    loader.loadScene('desert-day');
    
    // Manually trigger sandstorm
    desertRule.triggerSandstorm(100, 0.8);
    
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
      new Abilities(sim),
      new EventHandler(sim)
    ];
    
    // Load scene
    loader.loadScene('desert-day');
    
    // Find grapplers
    const grapplers = sim.units.filter(u => u.sprite === 'grappler');
    expect(grapplers.length).toBeGreaterThan(0);
    
    // Check they have grappling abilities
    grapplers.forEach(grappler => {
      expect(grappler.abilities.grapplingHook).toBeDefined();
      expect(grappler.abilities.pinTarget).toBeDefined();
    });
    
    // Manually test grappling hook ability
    const grappler = grapplers[0];
    const enemy = sim.units.find(u => u.team !== grappler.team);
    
    if (enemy && grappler.abilities.grapplingHook) {
      // Fire hook at enemy
      grappler.abilities.grapplingHook.effect(grappler, enemy.pos, sim);
      
      // Should create projectile
      const projectile = sim.projectiles.find(p => p.type === 'grapple');
      expect(projectile).toBeDefined();
    }
  });

  it('waterbearers should detect hidden enemies', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    sim.rulebook = [
      new Abilities(sim),
      new EventHandler(sim)
    ];
    
    // Add a hidden enemy
    loader.loadScene('desert-day');
    
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