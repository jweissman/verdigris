import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { addEffectsToUnit } from '../../src/test_helpers/ability_compat';
import { CommandHandler } from '../../src/rules/command_handler';
import { AirdropPhysics } from '../../src/rules/airdrop_physics';

describe('Combat Effectiveness Integration', () => {
  it('should test full tactical scenario with multiple constructs', () => {
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new AirdropPhysics(sim),
      new EventHandler(sim)
    ];
    
    // Create enemy formation
    const enemies = [
      { ...Encyclopaedia.unit('worm'), pos: { x: 35, y: 10 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 37, y: 12 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 39, y: 11 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('skeleton'), pos: { x: 36, y: 8 }, team: 'hostile' as const }
    ];
    
    enemies.forEach(enemy => sim.addUnit(enemy));
    
    // Deploy toymaker to left side 
    const toymaker = { ...Encyclopaedia.unit('toymaker'), pos: { x: 5, y: 10 } };
    // Note: maxUses is now handled by the ability system, not individual unit instances
    sim.addUnit(toymaker);
    
    // Test deployment commands
    sim.parseCommand('deploy clanker');
    sim.parseCommand('deploy freezebot'); 
    sim.parseCommand('deploy spiker');
    
    // Process commands and run simulation steps
    for (let i = 0; i < 10; i++) {
      sim.step();
      
      // Log construct behavior every few steps
      if (i % 3 === 0) {
        const constructs = sim.units.filter(u => u.tags?.includes('construct'));
        constructs.forEach(construct => {
          const nearbyEnemies = sim.units.filter(u => 
            u.team === 'hostile' && 
            Math.abs(u.pos.x - construct.pos.x) + Math.abs(u.pos.y - construct.pos.y) < 10
          );
          if (nearbyEnemies.length > 0) {
          }
        });
      }
    }
    
    // Verify tactical improvements
    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    expect(constructs.length).toBeGreaterThan(0);
    
    // Verify constructs have hunt tags for AI engagement
    const clanker = constructs.find(c => c.sprite === 'clanker');
    if (clanker) {
      expect(clanker.tags).toContain('hunt');
      expect(clanker.tags).toContain('aggressive');
    }
    
    // Verify deployment limits were respected
    const deployEvents = sim.processedEvents.filter(e => e.kind === 'spawn');
    expect(deployEvents.length).toBeLessThanOrEqual(5); // Max 5 deployments
  });
  
  it('should test construct immediate engagement upon spawn', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create nearby enemy
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 10 }, team: 'hostile' as const };
    sim.addUnit(enemy);
    
    const initialEnemyHp = enemy.hp;
    
    // Spawn construct very close to enemy
    const freezebot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 10, y: 10 } };
    freezebot.abilities = ['freezeRay'];
    sim.addUnit(freezebot);
    
    // Run several simulation steps
    for (let i = 0; i < 5; i++) {
      sim.step();
    }
    
    // Verify construct has hunt tag for AI engagement
    expect(freezebot.tags).toContain('hunt');

    // TODO Maybe verify enemy was engaged/frozen?
    // const freezebotAfter = sim.units.find(u => u.sprite === 'freezebot');
    // const freezebotTargeted = freezebot.meta.engagedTarget;
    // expect(freezebotTargeted).toEqual('worm')
  });
  
  it('should test Mechatron airdrop in combat scenario', () => {
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim),
      new AirdropPhysics(sim), 
      new EventHandler(sim),
      new Abilities(sim)
    ];
    
    // Create enemy cluster for Mechatron to impact
    const enemies = [];
    for (let i = 0; i < 6; i++) {
      const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 20 + i, y: 15 }, team: 'hostile' as const };
      enemies.push(enemy);
      sim.addUnit(enemy);
    }
    
    // Execute airdrop right into enemy formation
    sim.parseCommand('airdrop mechatron 22 15');
    
    // Process airdrop command
    sim.step();
    
    // Verify Mechatron was created and is dropping
    const mechatron = sim.units.find(u => u.sprite === 'mechatron');
    expect(mechatron).toBeDefined();
    expect(mechatron!.meta.dropping).toBe(true);
    expect(mechatron!.meta.z).toBeGreaterThan(15);
    
    // Simulate until landing
    let landingTick = 0;
    while (mechatron!.meta.dropping && landingTick < 30) {
      sim.step();
      landingTick++;
    }
    
    // Verify landing impact
    const impactEvents = sim.processedEvents.filter(e => 
      e.kind === 'aoe' && e.meta.aspect === 'kinetic'
    );
    expect(impactEvents.length).toBeGreaterThan(0);
    
    const latestImpact = impactEvents[impactEvents.length - 1];
    expect(latestImpact.meta.radius).toBe(8); // Huge unit impact
    expect(latestImpact.meta.amount).toBe(25); // High damage
  });
  
  it('should test construct abilities in extended combat', () => {
    const sim = new Simulator();
    sim.rulebook = [new Abilities(sim), new EventHandler(sim)];
    
    // Create Mechatron with all abilities
    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 15, y: 15 } };
    sim.addUnit(mechatron);
    
    // Create diverse enemy formation to test different abilities
    const closeEnemies = [
      { ...Encyclopaedia.unit('worm'), pos: { x: 17, y: 15 }, team: 'hostile' as const }, // EMP range
      { ...Encyclopaedia.unit('skeleton'), pos: { x: 16, y: 14 }, team: 'hostile' as const } // EMP range  
    ];
    
    const distantEnemies = [
      { ...Encyclopaedia.unit('demon'), pos: { x: 25, y: 15 }, team: 'hostile' as const }, // Missile range
      { ...Encyclopaedia.unit('worm'), pos: { x: 23, y: 18 }, team: 'hostile' as const } // Laser range
    ];
    
    [...closeEnemies, ...distantEnemies].forEach(enemy => sim.addUnit(enemy));
    
    // Test abilities manually to verify they work
    const abilities = mechatron.abilities;
    
    // Test missile barrage on distant enemy
    if (abilities.missileBarrage?.effect) {
      const initialProjectiles = sim.projectiles.length;
      abilities.missileBarrage.effect(mechatron, distantEnemies[0].pos, sim);
      expect(sim.projectiles.length).toBe(initialProjectiles + 6);
    }
    
    // Test EMP pulse on nearby enemies  
    if (abilities.empPulse?.effect) {
      const initialEvents = sim.queuedEvents.length;
      abilities.empPulse.effect(mechatron, mechatron.pos, sim);
      expect(sim.queuedEvents.length).toBe(initialEvents + 1);
      const empEvent = sim.queuedEvents[sim.queuedEvents.length - 1];
      expect(empEvent.meta.aspect).toBe('emp');
      expect(empEvent.meta.radius).toBe(8);
    }
    
    // Test laser sweep
    if (abilities.laserSweep?.effect) {
      const initialEvents = sim.queuedEvents.length;
      abilities.laserSweep.effect(mechatron, distantEnemies[1].pos, sim);
      const newEvents = sim.queuedEvents.slice(initialEvents);
      const laserEvents = newEvents.filter(e => e.meta.aspect === 'laser');
      expect(laserEvents.length).toBeGreaterThan(0);
    }
  });
});