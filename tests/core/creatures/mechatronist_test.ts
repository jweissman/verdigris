import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../../src/core/command_handler';
import { Abilities } from '../../../src/rules/abilities';
import { EventHandler } from '../../../src/rules/event_handler';

describe('Mechatronist Deployment System', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should create Mechatronist with proper abilities and stats', () => {
    
    const mechatronist = Encyclopaedia.unit('mechatronist');
    

    expect(mechatronist.sprite).toBe('mechatronist');
    expect(mechatronist.hp).toBe(30);
    expect(mechatronist.maxHp).toBe(30);
    expect(mechatronist.mass).toBe(1);
    expect(mechatronist.team).toBe('friendly');
    

    expect(mechatronist.tags).toContain('mechanical');
    expect(mechatronist.tags).toContain('leader'); 
    expect(mechatronist.tags).toContain('engineer');
    

    expect(mechatronist.abilities).toContain('callAirdrop');
    expect(mechatronist.abilities).toContain('tacticalOverride');
    

    expect(mechatronist.meta.canRideMechatron).toBe(true);
    
  });

  it('should call Mechatron airdrop when conditions are met', () => {
    const sim = new Simulator();
    
    

    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const ally1 = { ...Encyclopaedia.unit('soldier'), pos: { x: 4, y: 5 } };
    const ally2 = { ...Encyclopaedia.unit('soldier'), pos: { x: 6, y: 5 } };
    

    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(mechatronist);
    sim.addUnit(ally1);
    sim.addUnit(ally2);
    sim.addUnit(enemy);
    
    expect(sim.units.length).toBe(4);
    

    let airdropCalled = false;
    for (let tick = 0; tick < 150; tick++) { // Give enough time for cooldown
      sim.step();
      

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
    
    for (let tick = 0; tick < 200; tick++) {
      sim.step();

      if (deploymentPhase === 'waiting') {
        const mechatronInAir = sim.units.find(u => u.sprite === 'mechatron');
        if (mechatronInAir) {
          deploymentPhase = 'called';
          mechatron = mechatronInAir;
        }
      }
      

      if (deploymentPhase === 'called' && mechatron) {
        if (mechatron.meta?.dropping) {
          deploymentPhase = 'dropping';
        }
      }
      

      if (deploymentPhase === 'dropping') {
        const currentMechatron = sim.units.find(u => u.sprite === 'mechatron');
        if (currentMechatron && !currentMechatron.meta?.dropping) {
          deploymentPhase = 'landed';
          mechatron = currentMechatron;
          break;
        }
      }
    }
    
    expect(deploymentPhase).toBe('landed');
    expect(mechatron).toBeTruthy();
    expect(mechatron!.hp).toBeGreaterThan(170); // May take some damage from combat
    expect(mechatron!.tags).toContain('huge');
    expect(mechatron!.abilities.includes('missileBarrage')).toBe(true);
    

    expect(sim.particles.length).toBeGreaterThan(0); // Landing should create dust/debris
    
  });

  it('should verify tactical override boosts nearby mechanists', () => {
    const sim = new Simulator();  
    
    

    const commander = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const ally1 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 7, y: 5 } };
    const ally2 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 3, y: 5 } };
    
    const commanderUnit = sim.addUnit(commander);
    const ally1Unit = sim.addUnit(ally1);
    const ally2Unit = sim.addUnit(ally2);
    

    sim.forceAbility(commanderUnit.id, 'tacticalOverride', commander.pos);
    sim.step(); // Process the ability
    


    const actualAlly1 = sim.units.find(u => u.id === ally1Unit.id);
    const actualAlly2 = sim.units.find(u => u.id === ally2Unit.id);
    
    expect(actualAlly1.meta.tacticalBoost).toBe(true);
    expect(actualAlly2.meta.tacticalBoost).toBe(true);
    expect(actualAlly1.meta.tacticalBoostDuration).toBe(40);
    

    const energyParticles = sim.particles.filter(p => p.type === 'energy');
    expect(energyParticles.length).toBeGreaterThan(0);
  });
});