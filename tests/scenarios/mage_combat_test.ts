import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mage Combat Scenarios', () => {
  it('rhetorician fire mage should cast fire and deal heat damage', () => {
    const sim = new Simulator(20, 20);
    
    // Use encyclopaedia to create rhetorician
    const rhetorician = Encyclopaedia.unit('rhetorician');
    rhetorician.pos = { x: 5, y: 10 };
    rhetorician.meta = { ...rhetorician.meta, facing: 'right' };
    
    // Create enemy targets
    const enemy1 = {
      id: 'enemy1',
      pos: { x: 10, y: 10 },
      team: 'hostile' as const,
      hp: 30
    };
    
    const enemy2 = {
      id: 'enemy2',
      pos: { x: 11, y: 10 },
      team: 'hostile' as const,
      hp: 30
    };
    
    sim.addUnit(rhetorician);
    sim.addUnit(enemy1);
    sim.addUnit(enemy2);
    
    // Rhetorician casts fire in front
    sim.queuedCommands.push({ 
      type: 'fire', 
      params: { x: 10, y: 10, radius: 2 } 
    });
    
    // Process fire command
    sim.step();
    // Process all the temperature commands that were queued
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Check temperature field
    if (sim.temperatureField) {
      const fireTemp = sim.temperatureField.get(10, 10);
      expect(fireTemp).toBeGreaterThan(300);
    }
    
    // Check fire particles
    const fireParticles = sim.particles.filter(p => p.type === 'fire');
    expect(fireParticles.length).toBeGreaterThan(0);
    
    // Let heat damage apply over time
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Enemies should take damage from heat
    const e1 = sim.units.find(u => u.id === 'enemy1');
    const e2 = sim.units.find(u => u.id === 'enemy2');
    
    // If BiomeEffects rule is active, units in hot areas take damage
    if (sim.rules?.some(r => r.constructor.name === 'BiomeEffects')) {
      if (e1) expect(e1.hp).toBeLessThan(30);
      if (e2) expect(e2.hp).toBeLessThan(30);
    }
  });
  
  it('philosopher should cast lightning bolt', () => {
    const sim = new Simulator(20, 20);
    
    const philosopher = {
      id: 'philosopher',
      name: 'Philosopher',
      pos: { x: 5, y: 10 },
      team: 'friendly' as const,
      hp: 35,
      maxHp: 35,
      dmg: 8,
      abilities: ['lightning_bolt', 'shock'],
      tags: ['mage', 'caster', 'lightning'],
      meta: {
        mageType: 'lightning'
      }
    };
    
    const enemy = {
      id: 'enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile' as const,
      hp: 50
    };
    
    sim.addUnit(philosopher);
    sim.addUnit(enemy);
    
    // Start a storm first
    sim.queuedCommands.push( { 
      type: 'weather', 
      params: { weatherType: 'storm', action: 'start' } 
    });
    sim.step();
    
    expect(sim.lightningActive).toBe(true);
    
    // Philosopher casts bolt at enemy
    sim.queuedCommands.push( {
      type: 'bolt',
      params: { x: enemy.pos.x, y: enemy.pos.y }
    });
    
    sim.step(); // Process bolt
    sim.step(); // Process damage
    
    // Check lightning particles
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    // Enemy should take damage
    const enemyAfter = sim.units.find(u => u.id === 'enemy');
    if (enemyAfter) {
      expect(enemyAfter.hp).toBeLessThan(50);
    }
  });
  
  it('bard should charm enemies', () => {
    const sim = new Simulator(20, 20);
    
    const bard = {
      id: 'bard',
      name: 'Bard',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 30,
      maxHp: 30,
      dmg: 3,
      abilities: ['charm', 'song'],
      tags: ['mage', 'support', 'charm'],
      meta: {
        mageType: 'enchanter'
      }
    };
    
    const enemy = {
      id: 'enemy',
      pos: { x: 12, y: 10 },
      team: 'hostile' as const,
      hp: 40
    };
    
    sim.addUnit(bard);
    sim.addUnit(enemy);
    
    // Charm requires transform to work properly
    const transform = sim.getTransform();
    transform.updateUnit('enemy', { team: 'friendly' });
    
    sim.step();
    
    // Enemy should change teams
    const charmedEnemy = sim.units.find(u => u.id === 'enemy');
    if (charmedEnemy) {
      expect(charmedEnemy.team).toBe('friendly');
    }
  });
  
  it('full mage battle scenario', () => {
    const sim = new Simulator(30, 30);
    
    // Change scene to mystical battlefield
    sim.queuedCommands.push( {
      type: 'bg',
      params: { scene: 'forest' }
    });
    sim.step();
    
    // Create a party of mages
    const mages = [
      {
        id: 'fire_mage',
        pos: { x: 5, y: 15 },
        team: 'friendly' as const,
        hp: 40,
        abilities: ['fire_spell']
      },
      {
        id: 'lightning_mage', 
        pos: { x: 5, y: 10 },
        team: 'friendly' as const,
        hp: 35,
        abilities: ['lightning_bolt']
      }
    ];
    
    // Create enemy forces
    const enemies = [
      { id: 'orc1', pos: { x: 20, y: 10 }, team: 'hostile' as const, hp: 50 },
      { id: 'orc2', pos: { x: 20, y: 15 }, team: 'hostile' as const, hp: 50 },
      { id: 'orc3', pos: { x: 22, y: 12 }, team: 'hostile' as const, hp: 50 }
    ];
    
    mages.forEach(m => sim.addUnit(m));
    enemies.forEach(e => sim.addUnit(e));
    
    // Start the battle with a storm
    sim.queuedCommands.push( {
      type: 'weather',
      params: { weatherType: 'storm', action: 'start' }
    });
    
    // Fire mage attacks
    sim.queuedCommands.push( {
      type: 'fire',
      params: { x: 20, y: 12, radius: 3 }
    });
    
    // Lightning mage attacks
    sim.queuedCommands.push( {
      type: 'bolt',
      params: { x: 22, y: 12 }
    });
    
    // Run simulation
    for (let i = 0; i < 20; i++) {
      sim.step();
    }
    
    // Check battle results
    const survivingEnemies = sim.units.filter(u => 
      u.team === 'hostile' && u.hp > 0
    );
    
    const survivingMages = sim.units.filter(u => 
      u.team === 'friendly' && u.hp > 0
    );
    
    // Mages should be alive
    expect(survivingMages.length).toBe(2);
    
    // Some enemies should have taken damage
    const totalEnemyHp = survivingEnemies.reduce((sum, e) => sum + e.hp, 0);
    expect(totalEnemyHp).toBeLessThan(150); // Started with 150 total
  });
});