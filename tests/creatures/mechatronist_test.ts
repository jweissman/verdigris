import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { AirdropPhysics } from '../../src/rules/airdrop_physics';

describe('Mechatronist Deployment System', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should create Mechatronist with proper abilities and stats', () => {
    
    const mechatronist = Encyclopaedia.unit('mechatronist');
    
    // Check basic properties
    expect(mechatronist.sprite).toBe('mechatronist');
    expect(mechatronist.hp).toBe(30);
    expect(mechatronist.maxHp).toBe(30);
    expect(mechatronist.mass).toBe(1);
    expect(mechatronist.team).toBe('friendly');
    
    // Check tags for mechanist role
    expect(mechatronist.tags).toContain('mechanical');
    expect(mechatronist.tags).toContain('leader'); 
    expect(mechatronist.tags).toContain('engineer');
    
    // Check abilities
    expect(mechatronist.abilities).toHaveProperty('callAirdrop');
    expect(mechatronist.abilities).toHaveProperty('tacticalOverride');
    
    // Check riding capability
    expect(mechatronist.meta.canRideMechatron).toBe(true);
    
  });

  it('should call Mechatron airdrop when conditions are met', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new AirdropPhysics(sim), new EventHandler(sim)];
    
    
    // Create mechatronist and allies (need 2+ allies for trigger)
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const ally1 = { ...Encyclopaedia.unit('soldier'), pos: { x: 4, y: 5 } };
    const ally2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 6, y: 5 } };
    
    // Add distant enemy to trigger airdrop (distance > 8)
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(mechatronist);
    sim.addUnit(ally1);
    sim.addUnit(ally2);
    sim.addUnit(enemy);
    
    expect(sim.units.length).toBe(4);
    
    // Run simulation until airdrop triggers
    let airdropCalled = false;
    for (let tick = 0; tick < 150; tick++) { // Give enough time for cooldown
      sim.step();
      
      // Check if airdrop command was queued
      if (sim.queuedCommands.some(cmd => cmd.type === 'airdrop')) {
        airdropCalled = true;
        
        const airdropCmd = sim.queuedCommands.find(cmd => cmd.type === 'airdrop')!;
        expect(airdropCmd.params).toEqual({
          unitType: 'mechatron',
          x: 10,
          y: 5
        }); // Tactical midpoint
        break;
      }
      
      // Check if Mechatron already appeared (command was processed)
      if (sim.units.length > 4) {
        const mechatron = sim.units.find(u => u.sprite === 'mechatron');
        if (mechatron) {
          airdropCalled = true;
          expect(mechatron.meta.dropping).toBe(true);
          expect(mechatron.meta.z).toBeGreaterThan(19); // High altitude
          break;
        }
      }
    }
    
    expect(airdropCalled).toBe(true);
  });

  it('should handle full Mechatronist to Mechatron deployment sequence', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new AirdropPhysics(sim), new EventHandler(sim)];
    
    
    // Set up scenario for airdrop
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 3, y: 3 } };
    const ally1 = { ...Encyclopaedia.unit('soldier'), pos: { x: 2, y: 3 } };
    const ally2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 4, y: 3 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 3 }, team: 'hostile' as const };
    
    sim.addUnit(mechatronist);
    sim.addUnit(ally1);
    sim.addUnit(ally2);
    sim.addUnit(enemy);
    
    let deploymentPhase = 'waiting';
    let mechatron = null;
    
    // Run full deployment sequence
    for (let tick = 0; tick < 200; tick++) {
      sim.step();
      
      // Phase 1: Wait for airdrop call
      if (deploymentPhase === 'waiting' && sim.queuedCommands.some(cmd => cmd.type === 'airdrop')) {
        deploymentPhase = 'called';
      }
      
      // Phase 2: Mechatron appears in air
      if (deploymentPhase === 'called' && sim.units.length > 4) {
        mechatron = sim.units.find(u => u.sprite === 'mechatron');
        if (mechatron && mechatron.meta.dropping) {
          deploymentPhase = 'dropping';
        }
      }
      
      // Phase 3: Mechatron lands
      if (deploymentPhase === 'dropping' && mechatron && !mechatron.meta.dropping) {
        deploymentPhase = 'landed';
        break;
      }
    }
    
    expect(deploymentPhase).toBe('landed');
    expect(mechatron).toBeTruthy();
    expect(mechatron!.hp).toBeGreaterThan(180); // May take some landing damage
    expect(mechatron!.tags).toContain('huge');
    expect(mechatron!.abilities.missileBarrage).toBeDefined();
    
    // Check deployment created impact
    expect(sim.particles.length).toBeGreaterThan(0); // Landing should create dust/debris
    
  });

  it('should verify tactical override boosts nearby mechanists', () => {
    const sim = new Simulator();  
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler(sim)];
    
    
    // Create multiple mechanists for synergy trigger
    const commander = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const ally1 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 7, y: 5 } };
    const ally2 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 3, y: 5 } };
    
    sim.addUnit(commander);
    sim.addUnit(ally1);
    sim.addUnit(ally2);
    
    // Force tactical override trigger
    const override = commander.abilities.tacticalOverride;
    if (override.effect) {
      override.effect(commander, commander.pos, sim);
      
      // Check that allies received tactical boost
      expect(ally1.meta.tacticalBoost).toBe(true);
      expect(ally2.meta.tacticalBoost).toBe(true);
      expect(ally1.meta.tacticalBoostDuration).toBe(40);
      
      // Check energy particle was created
      const energyParticles = sim.particles.filter(p => p.type === 'energy');
      expect(energyParticles.length).toBeGreaterThan(0);
      
    }
  });
});