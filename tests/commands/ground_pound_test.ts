import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';

describe('Ground Pound', () => {
  test('hero can ground pound while jumping', () => {
    const sim = new Simulator(32, 32);
    
    // Add hero
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        jumping: true,
        targetX: 15,
        targetY: 10,
        jumpHeight: 5
      }
    });
    
    // Add enemies nearby
    const enemy1 = sim.addUnit({
      id: 'enemy1',
      pos: { x: 14, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    const enemy2 = sim.addUnit({
      id: 'enemy2',
      pos: { x: 16, y: 11 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    // Execute ground pound
    sim.queuedCommands.push({
      type: 'groundPound',
      unitId: hero.id,
      params: {
        damage: 30,
        radius: 3,
        knockback: 5
      }
    });
    
    sim.tick(); // Execute ground pound
    sim.tick(); // Process move command
    
    // Find the updated hero
    const updatedHero = sim.units.find(u => u.id === 'hero');
    
    // Hero should no longer be jumping
    expect(updatedHero?.meta?.jumping).toBeFalsy();
    
    // Hero should be at impact position
    expect(updatedHero?.pos.x).toBe(15);
    expect(updatedHero?.pos.y).toBe(10);
    
    // Process damage commands
    sim.tick();
    sim.tick();
    
    // Enemies should take damage
    const updatedEnemy1 = sim.units.find(u => u.id === 'enemy1');
    const updatedEnemy2 = sim.units.find(u => u.id === 'enemy2');
    
    expect(updatedEnemy1?.hp).toBeLessThan(50);
    expect(updatedEnemy2?.hp).toBeLessThan(50);
  });
  
  test('ground pound creates visual effects', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        jumping: true,
        targetX: 10,
        targetY: 10,
        jumpHeight: 5
      }
    });
    
    // Execute ground pound
    sim.queuedCommands.push({
      type: 'groundPound',
      unitId: hero.id,
      params: {
        damage: 25,
        radius: 3
      }
    });
    
    sim.tick(); // Execute ground pound and queue particle commands
    sim.tick(); // Process particle commands
    sim.tick(); // Make sure all commands are processed
    
    // Should have created particles
    const particles = sim.particleManager.particles;
    
    // Check if we have any particles at all
    console.log('Total particles:', particles.length);
    if (particles.length > 0) {
      console.log('Particle types:', [...new Set(particles.map(p => p.type))]);
    }
    
    // Ground pound should create particles (either shockwave or dust)
    expect(particles.length).toBeGreaterThan(0);
  });
  
  test('ground pound does not work when not jumping', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        jumping: false // Not jumping
      }
    });
    
    const enemy = sim.addUnit({
      id: 'enemy',
      pos: { x: 11, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    // Try to ground pound
    sim.queuedCommands.push({
      type: 'groundPound',
      unitId: hero.id,
      params: {
        damage: 30,
        radius: 3
      }
    });
    
    sim.tick();
    sim.tick();
    
    // Enemy should not take damage
    expect(enemy.hp).toBe(50);
  });
  
  test('ground pound damage falls off with distance', () => {
    const sim = new Simulator(32, 32);
    
    const hero = sim.addUnit({
      id: 'hero',
      type: 'hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      maxHp: 100,
      team: 'friendly',
      sprite: 'hero',
      tags: ['hero'],
      meta: {
        jumping: true,
        targetX: 10,
        targetY: 10,
        jumpHeight: 5
      }
    });
    
    // Add enemies at different distances
    const closeEnemy = sim.addUnit({
      id: 'closeEnemy',
      pos: { x: 10, y: 10 }, // Same position
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    const farEnemy = sim.addUnit({
      id: 'farEnemy',
      pos: { x: 13, y: 10 }, // 3 tiles away (edge of radius)
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'goblin'
    });
    
    // Execute ground pound
    sim.queuedCommands.push({
      type: 'groundPound',
      unitId: hero.id,
      params: {
        damage: 30,
        radius: 3
      }
    });
    
    sim.tick();
    sim.tick();
    sim.tick();
    
    const updatedCloseEnemy = sim.units.find(u => u.id === 'closeEnemy');
    const updatedFarEnemy = sim.units.find(u => u.id === 'farEnemy');
    
    // Close enemy should take more damage than far enemy
    const closeDamage = 50 - (updatedCloseEnemy?.hp || 50);
    const farDamage = 50 - (updatedFarEnemy?.hp || 50);
    
    expect(closeDamage).toBeGreaterThan(farDamage);
  });
});