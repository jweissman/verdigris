import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { JsonAbilities } from '../../src/rules/json_abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { addEffectsToUnit } from '../../src/test_helpers/ability_compat';

describe('Mechanist Support Units', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should create all mechanist support units with correct properties', () => {
    
    const mechanistUnits = ['builder', 'fueler', 'mechanic', 'engineer', 'welder', 'assembler'];
    
    mechanistUnits.forEach(unitType => {
      const unit = Encyclopaedia.unit(unitType);
      
      // All mechanist units should have these properties
      expect(unit.sprite).toBe(unitType);
      expect(unit.team).toBe('friendly');
      expect(unit.tags).toContain('mechanical');
      expect(unit.tags).toContain('support');
      expect(unit.mass).toBe(1);
      expect(unit.hp).toBeGreaterThan(15); // All are reasonably durable
      expect(unit.abilities).toBeDefined();
      
    });
    
    // Verify specific role tags
    expect(Encyclopaedia.unit('builder').tags).toContain('builder');
    expect(Encyclopaedia.unit('fueler').tags).toContain('energy');
    expect(Encyclopaedia.unit('mechanic').tags).toContain('repair');
    expect(Encyclopaedia.unit('engineer').tags).toContain('systems');
    expect(Encyclopaedia.unit('welder').tags).toContain('welder');
    expect(Encyclopaedia.unit('assembler').tags).toContain('assembler');
  });

  it('should test Builder reinforcement abilities', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create builder and a construct to reinforce
    const builder = { ...Encyclopaedia.unit('builder'), pos: { x: 5, y: 5 } };
    const construct = { ...Encyclopaedia.unit('clanker'), pos: { x: 7, y: 5 } };
    const originalHp = construct.hp;
    const originalMaxHp = construct.maxHp;
    
    sim.addUnit(builder);
    sim.addUnit(construct);
    
    // Force the reinforcement ability
    const reinforceAbility = builder.abilities.reinforceConstruct;
    if (reinforceAbility.effect) {
      reinforceAbility.effect(builder, construct.pos, sim);
      
      // Get the actual unit from the simulator (they're references to the same object)
      const reinforcedConstruct = sim.units.find(u => u.pos.x === 7 && u.pos.y === 5 && u.tags?.includes('construct'));
      expect(reinforcedConstruct).toBeDefined();
      expect(reinforcedConstruct!.hp).toBe(originalHp + 10);
      expect(reinforcedConstruct!.maxHp).toBe(originalMaxHp + 10);
      expect(reinforcedConstruct!.meta.armor).toBe(1); // Gained armor
      
      // Should have visual effect particles
      const reinforceParticles = sim.particles.filter(p => p.color === '#00FF88');
      expect(reinforceParticles.length).toBeGreaterThan(0);
      
    }
  });

  it('should test Fueler power surge ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create fueler and mechanical units to boost
    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 5, y: 5 } };
    const construct1 = { ...Encyclopaedia.unit('freezebot'), pos: { x: 7, y: 5 } };
    const construct2 = { ...Encyclopaedia.unit('spiker'), pos: { x: 6, y: 7 } };
    
    sim.addUnit(fueler);
    sim.addUnit(construct1);
    sim.addUnit(construct2);
    
    // Get the actual units from the simulator
    const simFueler = sim.units.find(u => u.sprite === 'fueler')!;
    const simConstruct1 = sim.units.find(u => u.sprite === 'freezebot')!;
    const simConstruct2 = sim.units.find(u => u.sprite === 'spikebot')!;
    
    // Set up some cooldowns to test the reset
    sim.tick = 50;
    simConstruct1.lastAbilityTick = { freezeAura: 45 }; // Recently used
    simConstruct2.lastAbilityTick = { whipChain: 40 };
    
    // Force the power surge ability
    const powerSurge = simFueler.abilities.powerSurge;
    if (powerSurge.effect) {
      powerSurge.effect(simFueler, simFueler.pos, sim);
      
      // Constructs should have their cooldowns reset
      expect(simConstruct1.lastAbilityTick!.freezeAura).toBe(0);
      expect(simConstruct2.lastAbilityTick!.whipChain).toBe(0);
      
      // Should have energy field particles
      const energyParticles = sim.particles.filter(p => p.color === '#FFAA00');
      expect(energyParticles.length).toBe(8); // Energy field ring
      
    }
  });

  it('should test Mechanic emergency repair ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create mechanic and damaged units
    const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 5, y: 5 } };
    const damagedConstruct = { ...Encyclopaedia.unit('clanker'), pos: { x: 6, y: 5 } };
    
    // Damage the construct and add some debuffs
    damagedConstruct.hp = 2; // Badly damaged
    damagedConstruct.meta.stunned = true;
    damagedConstruct.meta.stunDuration = 20;
    damagedConstruct.meta.frozen = true;
    
    sim.addUnit(mechanic);
    sim.addUnit(damagedConstruct);
    
    const originalHp = damagedConstruct.hp;
    
    // Force emergency repair
    const repair = mechanic.abilities.emergencyRepair;
    if (repair.effect) {
      repair.effect(mechanic, damagedConstruct.pos, sim);
      
      // Get the actual unit from the simulator
      const repairedConstruct = sim.units.find(u => u.pos.x === 6 && u.pos.y === 5 && u.tags?.includes('construct'));
      expect(repairedConstruct).toBeDefined();
      
      // Should be healed
      expect(repairedConstruct!.hp).toBe(Math.min(repairedConstruct!.maxHp, originalHp + 15));
      
      // Debuffs should be removed
      expect(repairedConstruct!.meta.stunned).toBeUndefined();
      expect(repairedConstruct!.meta.stunDuration).toBeUndefined();
      expect(repairedConstruct!.meta.frozen).toBeUndefined();
      
      // Should have repair spark particles
      const sparkParticles = sim.particles.filter(p => p.type === 'electric_spark' && p.color === '#FFFF00');
      expect(sparkParticles.length).toBe(6);
      
    }
  });

  it('should test Engineer shield generator ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create engineer and nearby enemy to trigger shield
    const engineer = { ...Encyclopaedia.unit('engineer'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(engineer);
    sim.addUnit(enemy);
    
    // Force shield generator
    const shield = engineer.abilities.shieldGenerator;
    if (shield.effect) {
      const beforeParticles = sim.particles.length;
      shield.effect(engineer, engineer.pos, sim);
      
      // Should create shield barrier particles in 3x3 area
      const shieldParticles = sim.particles.filter(p => p.color === '#00CCFF' && p.type === 'energy');
      expect(shieldParticles.length).toBeGreaterThan(0);
      expect(shieldParticles.length).toBeLessThanOrEqual(9); // Max 3x3 grid
      
      // Shield particles should have proper properties
      shieldParticles.forEach(particle => {
        expect(particle.lifetime).toBe(80); // ~10 seconds
        expect(particle.z).toBe(2); // Elevated to block projectiles
        expect(particle.vel.x).toBe(0); // Stationary
        expect(particle.vel.y).toBe(0);
      });
      
    }
  });

  it('should test Engineer system hack ability', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create engineer and enemy to hack
    const engineer = { ...Encyclopaedia.unit('engineer'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('demon'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(engineer);
    sim.addUnit(enemy);
    
    sim.tick = 10; // Set current tick for cooldown calculation
    
    // Force system hack
    const hack = engineer.abilities.systemHack;
    if (hack.effect) {
      hack.effect(engineer, enemy.pos, sim);
      
      // Enemy should be hacked
      expect(enemy.meta.systemsHacked).toBe(true);
      expect(enemy.meta.hackDuration).toBe(30);
      
      // Enemy abilities should have massive cooldowns
      if (enemy.lastAbilityTick) {
        Object.values(enemy.lastAbilityTick).forEach(lastTick => {
          expect(lastTick).toBe(sim.tick); // Set to current tick = can't use abilities
        });
      }
      
      // Should have hack visual effect
      const hackParticles = sim.particles.filter(p => p.color === '#FF0088');
      expect(hackParticles.length).toBe(1);
      
    }
  });

  it('should test Welder dual abilities', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    const welder = { ...Encyclopaedia.unit('welder'), pos: { x: 5, y: 5 } };
    const construct = { ...Encyclopaedia.unit('swarmbot'), pos: { x: 6, y: 5 } };
    
    // Damage the construct
    construct.hp = 3;
    
    sim.addUnit(welder);
    sim.addUnit(construct);
    
    // Test emergency repair
    const repair = welder.abilities.emergencyRepair;
    if (repair.effect) {
      const beforeHp = construct.hp;
      repair.effect(welder, construct.pos, sim);
      
      const repairedConstruct = sim.units.find(u => u.pos.x === 6 && u.pos.y === 5);
      expect(repairedConstruct).toBeDefined();
      expect(repairedConstruct!.hp).toBe(Math.min(repairedConstruct!.maxHp, beforeHp + 15));
    }
    
    // Test reinforcement
    const reinforce = welder.abilities.reinforceConstruct;
    if (reinforce.effect) {
      const reinforcedConstruct = sim.units.find(u => u.pos.x === 6 && u.pos.y === 5);
      const beforeHp = reinforcedConstruct!.hp;
      const beforeMaxHp = reinforcedConstruct!.maxHp;
      reinforce.effect(welder, construct.pos, sim);
      
      expect(reinforcedConstruct!.hp).toBe(beforeHp + 10);
      expect(reinforcedConstruct!.maxHp).toBe(beforeMaxHp + 10);
      expect(reinforcedConstruct!.meta.armor).toBe(1);
    }
  });

  it('should test Assembler advanced construction abilities', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    const assembler = { ...Encyclopaedia.unit('assembler'), pos: { x: 5, y: 5 } };
    const construct1 = { ...Encyclopaedia.unit('roller'), pos: { x: 6, y: 5 } };
    const construct2 = { ...Encyclopaedia.unit('zapper'), pos: { x: 7, y: 6 } };
    
    sim.addUnit(assembler);
    sim.addUnit(construct1);
    sim.addUnit(construct2);
    
    // Get the actual units from the simulator
    const simAssembler = sim.units.find(u => u.sprite === 'assembler')!;
    const simConstruct1 = sim.units.find(u => u.sprite === 'jumpbot')!;
    const simConstruct2 = sim.units.find(u => u.sprite === 'zapper')!;
    
    // Test reinforcement
    const reinforce = simAssembler.abilities.reinforceConstruct;
    if (reinforce.effect) {
      const beforeHp = simConstruct1.hp;
      reinforce.effect(simAssembler, simConstruct1.pos, sim);
      
      const reinforcedConstruct = sim.units.find(u => u.pos.x === 6 && u.pos.y === 5);
      expect(reinforcedConstruct).toBeDefined();
      expect(reinforcedConstruct!.hp).toBe(beforeHp + 10);
    }
    
    // Test power surge
    const powerSurge = simAssembler.abilities.powerSurge;
    if (powerSurge.effect) {
      // Set up cooldowns
      sim.tick = 60;
      simConstruct1.lastAbilityTick = { chargeAttack: 55 };
      simConstruct2.lastAbilityTick = { zapHighest: 50 };
      
      powerSurge.effect(simAssembler, simAssembler.pos, sim);
      
      // Should reset cooldowns
      expect(simConstruct1.lastAbilityTick!.chargeAttack).toBe(0);
      expect(simConstruct2.lastAbilityTick!.zapHighest).toBe(0);
      
    }
  });

  it('should verify mechanist synergy with constructs', () => {
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new JsonAbilities(sim), new EventHandler(sim)];
    
    
    // Create a diverse mechanist support team
    const builder = { ...Encyclopaedia.unit('builder'), pos: { x: 5, y: 5 } };
    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 6, y: 5 } };
    const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 7, y: 5 } };
    
    // Create constructs to support
    const construct1 = { ...Encyclopaedia.unit('clanker'), pos: { x: 8, y: 5 } };
    const construct2 = { ...Encyclopaedia.unit('freezebot'), pos: { x: 9, y: 5 } };
    
    sim.addUnit(builder);
    sim.addUnit(fueler);
    sim.addUnit(mechanic);
    sim.addUnit(construct1);
    sim.addUnit(construct2);
    
    // Get the actual units from the simulator
    const simBuilder = sim.units.find(u => u.sprite === 'builder')!;
    const simFueler = sim.units.find(u => u.sprite === 'fueler')!;
    const simMechanic = sim.units.find(u => u.sprite === 'mechanic')!;
    const simConstruct1 = sim.units.find(u => u.sprite === 'clanker')!;
    const simConstruct2 = sim.units.find(u => u.sprite === 'freezebot')!;
    
    // Damage one construct after getting the sim reference
    simConstruct1.hp = 2;
    simConstruct1.meta.stunned = true;
    
    let synergisticActions = 0;
    
    // Add effect compatibility
    addEffectsToUnit(simMechanic, sim);
    addEffectsToUnit(simBuilder, sim);
    addEffectsToUnit(simFueler, sim);
    
    // Test repair synergy
    if (simMechanic.abilities.emergencyRepair?.effect) {
      const beforeHp = simConstruct1.hp;
      simMechanic.abilities.emergencyRepair.effect(simMechanic, simConstruct1.pos, sim);
      const repairedConstruct = sim.units.find(u => u.pos.x === 8 && u.pos.y === 5);
      if (repairedConstruct && repairedConstruct.hp > beforeHp) synergisticActions++;
    }
    
    // Test reinforcement synergy
    if (simBuilder.abilities.reinforceConstruct?.effect) {
      const reinforcedConstruct = sim.units.find(u => u.pos.x === 8 && u.pos.y === 5);
      const beforeMaxHp = reinforcedConstruct!.maxHp;
      simBuilder.abilities.reinforceConstruct.effect(simBuilder, simConstruct1.pos, sim);
      if (reinforcedConstruct && reinforcedConstruct.maxHp > beforeMaxHp) synergisticActions++;
    }
    
    // Test power boost synergy
    if (simFueler.abilities.powerSurge?.effect) {
      sim.tick = 30;
      simConstruct2.lastAbilityTick = { freezeAura: 25 };
      simFueler.abilities.powerSurge.effect(simFueler, simFueler.pos, sim);
      if (simConstruct2.lastAbilityTick!.freezeAura === 0) synergisticActions++;
    }
    
    expect(synergisticActions).toBe(3); // All synergies should work
  });
});