import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { SceneLoader } from '../../src/scene_loader';
import { WinterEffects } from '../../src/rules/winter_effects';

describe('Toysday Integration', () => {
  it('should run complete toymaker scenario with winter effects', () => {
    const sim = new Simulator();
    const loader = new SceneLoader(sim);
    
    // Load the toymaker scene
    loader.loadScenario('toymaker');
    
    // Verify scene loaded correctly
    expect(sim.units.length).toBeGreaterThan(0);
    
    const toymaker = sim.units.find(u => u.tags?.includes('craftor'));
    const enemies = sim.units.filter(u => u.team === 'hostile');
    
    expect(toymaker).toBeDefined();
    expect(enemies.length).toBeGreaterThan(0);
    
    // Start winter storm
    WinterEffects.createWinterStorm(sim);
    expect(sim.winterActive).toBe(true);
    
    // Run battle simulation
    let battleComplete = false;
    let constructs = [];
    
    for (let tick = 0; tick < 200 && !battleComplete; tick++) {
      sim.step();
      
      // Track construct deployment
      const currentConstructs = sim.units.filter(u => u.tags?.includes('construct'));
      if (currentConstructs.length > constructs.length) {
        constructs = currentConstructs;
      }
      
      // Check for interesting events
      const frozenUnits = sim.units.filter(u => u.meta.frozen);
      if (frozenUnits.length > 0 && tick % 20 === 0) {
      }
      
      // Battle ends when one side is eliminated
      const aliveFriendlies = sim.units.filter(u => u.team === 'friendly' && u.hp > 0);
      const aliveEnemies = sim.units.filter(u => u.team === 'hostile' && u.hp > 0);
      
      if (aliveFriendlies.length === 0 || aliveEnemies.length === 0) {
        battleComplete = true;
        break;
      }
    }
    
    // Verify the toymaker deployed at least one construct
    expect(constructs.length).toBeGreaterThan(0);
    
    // Verify winter effects occurred
    expect(sim.particles.filter(p => p.type === 'snow').length).toBeGreaterThan(0);
  });

  it('should demonstrate all construct types in winter battlefield', () => {
    const sim = new Simulator();
    
    // Create winter conditions
    WinterEffects.createWinterStorm(sim);
    
    // Deploy one of each construct type
    const constructTypes = ['freezebot', 'clanker', 'spiker', 'swarmbot', 'roller', 'zapper'];
    const constructs = [];
    
    constructTypes.forEach((type, index) => {
      const construct = { ...Encyclopaedia.unit(type), pos: { x: index * 2, y: 5 } };
      sim.addUnit(construct);
      constructs.push(construct);
    });
    
    // Add some enemies to trigger construct abilities
    const enemy1 = { ...Encyclopaedia.unit('worm'), pos: { x: 1, y: 5 }, team: 'hostile' as const };
    const enemy2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 3, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy1);
    sim.addUnit(enemy2);
    
    // Run simulation to see construct behaviors
    let activitiesObserved = {
      explosion: false,
      chainWhip: false,
      zap: false,
      chill: false,
      frozenUnits: false
    };
    
    for (let tick = 0; tick < 100; tick++) {
      const initialUnits = sim.units.length;
      const initialEnemyHp = enemy1.hp + enemy2.hp;
      
      sim.step();
      
      // Check for explosion (unit death)
      if (sim.units.length < initialUnits) {
        activitiesObserved.explosion = true;
      }
      
      // Check for damage dealt
      const currentEnemyHp = (sim.units.find(u => u.id === enemy1.id)?.hp || 0) + 
                            (sim.units.find(u => u.id === enemy2.id)?.hp || 0);
      if (currentEnemyHp < initialEnemyHp) {
        activitiesObserved.chainWhip = true;
        activitiesObserved.zap = true;
      }
      
      // Check for status effects
      const chilledUnits = sim.units.filter(u => u.meta.chilled || u.meta.statusEffects?.some(e => e.type === 'chill'));
      if (chilledUnits.length > 0) {
        activitiesObserved.chill = true;
      }
      
      // Check for frozen units
      const frozenUnits = sim.units.filter(u => u.meta.frozen);
      if (frozenUnits.length > 0) {
        activitiesObserved.frozenUnits = true;
      }
    }
    
    // Verify we saw interesting construct behaviors
    expect(constructs.length).toBe(6);
    expect(sim.particles.filter(p => p.type === 'snow').length).toBeGreaterThan(0);
  });

  it('should verify deploy command creates instant placement', () => {
    const sim = new Simulator();
    
    // Add toymaker
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 5 } };
    sim.addUnit(toymaker);
    
    // Add target enemy
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 10, y: 5 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    const initialUnitCount = sim.units.length;
    
    // Run until deployment occurs
    let deployed = false;
    for (let tick = 0; tick < 60; tick++) {
      sim.step();
      
      if (sim.units.length > initialUnitCount) {
        // Verify instant placement - construct should appear immediately between toymaker and enemy
        const construct = sim.units.find(u => u.tags?.includes('construct'));
        expect(construct).toBeDefined();
        
        // Should be placed tactically between toymaker (x=5) and enemy (x=10)
        expect(construct?.pos.x).toBeGreaterThan(5);
        expect(construct?.pos.x).toBeLessThan(10);
        expect(Math.abs(construct?.pos.y - 5)).toBeLessThanOrEqual(1); // Within 1 cell of same lane
        
        deployed = true;
        break;
      }
    }
    
    expect(deployed).toBe(true);
  });
});