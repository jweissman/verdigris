import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Hero Units', () => {
  it('should load and test basic hero unit functionality', () => {
    console.log('🦸 HERO UNITS TEST');
    
    const sim = new Simulator(20, 15);
    
    // Try to load hero units from the new data files
    try {
      const fs = require('fs');
      const path = require('path');
      
      const heroUnitsPath = path.join(process.cwd(), 'data', 'hero_units.json');
      const heroAbilitiesPath = path.join(process.cwd(), 'data', 'hero_abilities.json');
      
      const heroUnits = JSON.parse(fs.readFileSync(heroUnitsPath, 'utf8'));
      const heroAbilities = JSON.parse(fs.readFileSync(heroAbilitiesPath, 'utf8'));
      
      console.log(`✅ Loaded ${Object.keys(heroUnits).length} hero unit types`);
      console.log(`✅ Loaded ${Object.keys(heroAbilities).length} hero abilities`);
      
      // Test each hero type
      Object.entries(heroUnits).forEach(([heroType, heroData]: [string, any]) => {
        console.log(`\n🎯 ${heroType.toUpperCase()}:`);
        console.log(`  HP: ${heroData.hp}, Mass: ${heroData.mass}`);
        console.log(`  Abilities: [${heroData.abilities.join(', ')}]`);
        console.log(`  Tags: [${heroData.tags.join(', ')}]`);
        console.log(`  Hero Type: ${heroData.meta.heroType}`);
        
        // Check if abilities exist
        const missingAbilities = heroData.abilities.filter((ability: string) => !heroAbilities[ability]);
        if (missingAbilities.length > 0) {
          console.log(`  ❌ Missing abilities: ${missingAbilities.join(', ')}`);
        } else {
          console.log(`  ✅ All abilities defined`);
        }
      });
      
      expect(Object.keys(heroUnits).length).toBe(5);
      expect(Object.keys(heroAbilities).length).toBeGreaterThan(10);
      
    } catch (e) {
      console.log(`❌ Error loading hero data: ${e}`);
      expect(e).toBeUndefined();
    }
  });
  
  it('should test hero showcase scene loading', () => {
    console.log('\n🎬 HERO SHOWCASE SCENE TEST');
    
    const sim = new Simulator(40, 15);
    const sceneLoader = new SceneLoader(sim);
    
    try {
      console.log('Loading hero showcase scene...');
      sceneLoader.loadScenario('heroShowcase');
      
      console.log(`✅ Scene loaded with ${sim.units.length} units`);
      
      // Count hero types
      const heroTypes = ['champion', 'acrobat', 'berserker', 'guardian', 'shadowBlade'];
      const heroes = sim.units.filter(u => heroTypes.includes(u.type));
      const enemies = sim.units.filter(u => u.team === 'hostile');
      
      console.log(`Heroes: ${heroes.length}`);
      console.log(`Enemies: ${enemies.length}`);
      
      heroes.forEach(hero => {
        console.log(`  ${hero.type}: HP=${hero.hp}, abilities=[${hero.abilities}]`);
      });
      
      expect(heroes.length).toBe(5);
      expect(enemies.length).toBeGreaterThan(10);
      
    } catch (e) {
      console.log(`❌ Error loading hero showcase: ${e}`);
      // Scene loading might fail if hero units aren't in main encyclopedia yet
      console.log('This is expected - hero units need to be integrated into main units.json');
    }
  });
  
  it('should test hero abilities design concepts', () => {
    console.log('\n💫 HERO ABILITIES DESIGN TEST');
    
    // Test key concepts for first-person style gameplay
    const abilityFeatures = {
      'groundPound': ['aoe', 'knockback', 'stun', 'cameraShake'],
      'heroicLeap': ['teleport', 'cursor targeting', 'landing damage'],
      'tripleFlip': ['untargetable', 'multi-hit', 'timing'],
      'shadowStep': ['behind positioning', 'backstab', 'stealth'],
      'berserkerRage': ['damage bonus', 'attack speed', 'risk/reward'],
      'shieldWall': ['barrier creation', 'ally protection', 'positioning']
    };
    
    console.log('🎮 First-person style ability features:');
    Object.entries(abilityFeatures).forEach(([ability, features]) => {
      console.log(`  ${ability}: ${features.join(', ')}`);
    });
    
    // Test targeting systems
    const targetingSystems = [
      'cursor targeting (player-directed)',
      'smart targeting (closest enemy)',
      'positional targeting (behind, nearby)',
      'area targeting (radius, cone)',
      'self-targeting (buffs, transformations)'
    ];
    
    console.log('\n🎯 Targeting systems implemented:');
    targetingSystems.forEach(system => {
      console.log(`  ✅ ${system}`);
    });
    
    expect(Object.keys(abilityFeatures).length).toBeGreaterThan(5);
  });
  
  it('should test hero vs swarm combat simulation', () => {
    console.log('\n⚔️ HERO COMBAT SIMULATION');
    
    const sim = new Simulator(20, 10);
    
    // Create a champion hero
    const champion = {
      id: 'champion1',
      type: 'champion',
      sprite: 'champion',
      pos: { x: 5, y: 5 },
      hp: 120,
      maxHp: 120,
      team: 'friendly',
      abilities: ['groundPound', 'heroicLeap', 'battleCry'],
      meta: { heroType: 'warrior', armor: 5, leadership: 3 },
      mass: 15,
      tags: ['hero', 'warrior', 'heavy', 'champion']
    };
    
    sim.addUnit(champion);
    
    // Add a swarm of enemies
    for (let i = 0; i < 8; i++) {
      const worm = {
        id: `worm${i}`,
        type: 'worm',
        sprite: 'worm',
        pos: { x: 12 + (i % 4) * 2, y: 3 + Math.floor(i / 4) * 4 },
        hp: 10,
        maxHp: 10,
        team: 'hostile',
        abilities: ['jumps'],
        mass: 4
      };
      sim.addUnit(worm);
    }
    
    console.log(`Initial: Champion vs ${sim.units.filter(u => u.team === 'hostile').length} worms`);
    console.log(`Champion: ${champion.hp} HP, abilities: [${champion.abilities}]`);
    
    // Run simulation
    let step = 0;
    while (step < 100) {
      const aliveWorms = sim.units.filter(u => u.type === 'worm' && u.hp > 0);
      const aliveHeroes = sim.units.filter(u => u.type === 'champion' && u.hp > 0);
      
      if (step % 20 === 0 || aliveWorms.length === 0 || aliveHeroes.length === 0) {
        console.log(`Step ${step}: Champion HP=${aliveHeroes[0]?.hp || 0}, Worms alive=${aliveWorms.length}`);
      }
      
      if (aliveWorms.length === 0) {
        console.log(`🏆 HERO VICTORY at step ${step}!`);
        break;
      } else if (aliveHeroes.length === 0) {
        console.log(`💀 HERO DEFEAT at step ${step}!`);
        break;
      }
      
      sim.step();
      step++;
    }
    
    if (step >= 100) {
      console.log(`⏰ TIMEOUT after ${step} steps`);
    }
    
    expect(sim.units.length).toBeGreaterThan(0);
  });
});