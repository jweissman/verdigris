import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/rules/command_handler';
import { AirdropPhysics } from '../../src/rules/airdrop_physics';

describe('Mechatron Airdrop System', () => {
  it('should create Mechatron with proper dimensions and abilities', () => {
    
    const mechatron = Encyclopaedia.unit('mechatron');
    
    // Check basic properties
    expect(mechatron.sprite).toBe('mechatron');
    expect(mechatron.hp).toBe(200);
    expect(mechatron.maxHp).toBe(200);
    expect(mechatron.mass).toBe(5);
    expect(mechatron.team).toBe('friendly');
    
    // Check tags
    expect(mechatron.tags).toContain('mechanical');
    expect(mechatron.tags).toContain('huge');
    expect(mechatron.tags).toContain('artillery');
    expect(mechatron.tags).toContain('hunt');
    
    // Check custom dimensions
    expect(mechatron.meta.huge).toBe(true);
    expect(mechatron.meta.width).toBe(32);
    expect(mechatron.meta.height).toBe(64);
    expect(mechatron.meta.cellsWide).toBe(4);
    expect(mechatron.meta.cellsHigh).toBe(8);
    expect(mechatron.meta.armor).toBe(5);
    
    // Check abilities
    expect(mechatron.abilities).toHaveProperty('missileBarrage');
    expect(mechatron.abilities).toHaveProperty('laserSweep');
    expect(mechatron.abilities).toHaveProperty('empPulse');
    expect(mechatron.abilities).toHaveProperty('shieldRecharge');
    
  });
  
  it('should execute airdrop command successfully', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new AirdropPhysics(sim), new EventHandler(sim)];
    
    
    const initialUnits = sim.units.length;
    expect(initialUnits).toBe(0);
    
    // Execute airdrop command
    sim.parseCommand('airdrop mechatron 50 50');
    
    // Command should be queued
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('airdrop');
    expect(sim.queuedCommands[0].args).toEqual(['mechatron', '50', '50']);
    
    // Process the command
    sim.step();
    
    // Mechatron should be created in the air
    expect(sim.units.length).toBe(1);
    const mechatron = sim.units[0];
    expect(mechatron.sprite).toBe('mechatron');
    expect(mechatron.pos.x).toBe(50);
    expect(mechatron.pos.y).toBe(50);
    expect(mechatron.meta.z).toBeGreaterThan(19); // High altitude (allowing for floating point)
    expect(mechatron.meta.dropping).toBe(true);
    
    // Should have atmospheric entry particles
    expect(sim.particles.length).toBeGreaterThan(0);
    const smokeParticles = sim.particles.filter(p => p.type === 'debris');
    expect(smokeParticles.length).toBe(12); // 12 smoke trail particles
    
  });
  
  it('should handle Mechatron landing with impact damage', () => {
    const sim = new Simulator();
    sim.rulebook = [new AirdropPhysics(sim), new EventHandler(sim)];
    
    
    // Create enemies around landing zone
    const enemies = [];
    for (let i = 0; i < 5; i++) {
      const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 50 + i, y: 50 }, team: 'hostile' as const };
      enemies.push(enemy);
      sim.addUnit(enemy);
    }
    
    // Create Mechatron at low altitude (about to land)
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 50, y: 50 } };
    mechatron.meta.z = 0.5; // Very low altitude - will land in one step
    mechatron.meta.dropping = true;
    mechatron.meta.dropSpeed = 0.8;
    mechatron.meta.landingImpact = true;
    sim.addUnit(mechatron);
    
    const enemiesBefore = enemies.map(e => e.hp);
    
    // Run physics step - should cause landing
    sim.step();
    
    // Mechatron should be on ground
    const landedMechatron = sim.units.find(u => u.sprite === 'mechatron')!;
    expect(Math.abs(landedMechatron.meta.z)).toBeLessThan(0.01);
    expect(landedMechatron.meta.dropping).toBe(false);
    expect(landedMechatron.meta.landingImpact).toBeUndefined();
    
    // Should have created impact damage (check processed events since they execute immediately)
    const impactEvents = sim.processedEvents.filter(e => e.kind === 'aoe' && e.meta.aspect === 'kinetic');
    expect(impactEvents.length).toBeGreaterThan(0);
    const impactEvent = impactEvents[impactEvents.length - 1]; // Get most recent impact
    expect(impactEvent).toBeDefined();
    expect(impactEvent.meta.radius).toBe(8); // Large impact for huge unit
    expect(impactEvent.meta.amount).toBe(25); // High damage
    
    // Should have created dust particles
    const dustParticles = sim.particles.filter(p => p.color === '#8B4513');
    expect(dustParticles.length).toBe(20);
    
  });
  
  it('should test Mechatron abilities in combat', () => {
    const sim = new Simulator();
    sim.rulebook = [new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create Mechatron and enemies
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 10, y: 10 } };
    sim.addUnit(mechatron);
    
    // Add enemies at various distances to test different abilities
    const closeEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 10 }, team: 'hostile' as const }; // 5 cells away - missile range
    const veryCloseEnemy = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 10 }, team: 'hostile' as const }; // 2 cells away - EMP range
    sim.addUnit(closeEnemy);
    sim.addUnit(veryCloseEnemy);
    
    // Test missile barrage ability
    const missileBarrage = mechatron.abilities.missileBarrage;
    expect(missileBarrage).toBeDefined();
    expect(missileBarrage.cooldown).toBe(80);
    
    if (missileBarrage.effect) {
      const initialProjectiles = sim.projectiles.length;
      missileBarrage.effect(mechatron, closeEnemy.pos, sim);
      
      // Should create 6 missile projectiles
      expect(sim.projectiles.length).toBe(initialProjectiles + 6);
      const missiles = sim.projectiles.slice(-6);
      missiles.forEach(missile => {
        expect(missile.type).toBe('bomb');
        expect(missile.damage).toBe(12);
        expect(missile.team).toBe('friendly');
        expect(missile.z).toBe(8); // High altitude missiles
      });
      
    }
    
    // Test EMP pulse ability
    const empPulse = mechatron.abilities.empPulse;
    expect(empPulse).toBeDefined();
    
    if (empPulse.effect) {
      const initialEvents = sim.queuedEvents.length;
      empPulse.effect(mechatron, mechatron.pos, sim);
      
      // Should create EMP AoE event
      expect(sim.queuedEvents.length).toBe(initialEvents + 1);
      const empEvent = sim.queuedEvents[sim.queuedEvents.length - 1];
      expect(empEvent.kind).toBe('aoe');
      expect(empEvent.meta.aspect).toBe('emp');
      expect(empEvent.meta.radius).toBe(8);
      expect(empEvent.meta.stunDuration).toBe(40);
      
    }
    
    // Test laser sweep ability
    const laserSweep = mechatron.abilities.laserSweep;
    if (laserSweep.effect) {
      const initialEvents = sim.queuedEvents.length;
      laserSweep.effect(mechatron, closeEnemy.pos, sim);
      
      // Should create multiple laser damage events along the line
      const newEvents = sim.queuedEvents.slice(initialEvents);
      const laserEvents = newEvents.filter(e => e.meta.aspect === 'laser');
      expect(laserEvents.length).toBeGreaterThan(0);
      
      laserEvents.forEach(event => {
        expect(event.meta.amount).toBe(15);
        expect(event.meta.piercing).toBe(true);
      });
      
    }
    
  });
});