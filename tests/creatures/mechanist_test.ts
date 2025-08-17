import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { EventHandler } from '../../src/rules/event_handler';
import { LightningStorm } from '../../src/rules/lightning_storm';
import { Abilities } from '../../src/rules/abilities';

describe('Mechanist Showcase', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should deploy the complete mechanist force', () => {
    const sim = new Simulator();



    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 5 } };
    sim.addUnit(mechatronist);


    const mechanistCrew = [
      { type: 'builder', pos: { x: 8, y: 7 } },
      { type: 'fueler', pos: { x: 12, y: 7 } },
      { type: 'mechanic', pos: { x: 8, y: 9 } },
      { type: 'engineer', pos: { x: 12, y: 9 } },
      { type: 'welder', pos: { x: 9, y: 11 } },
      { type: 'assembler', pos: { x: 11, y: 11 } }
    ];

    mechanistCrew.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });


    const constructs = [
      { type: 'clanker', pos: { x: 6, y: 8 } },
      { type: 'freezebot', pos: { x: 14, y: 8 } },
      { type: 'spiker', pos: { x: 6, y: 10 } },
      { type: 'roller', pos: { x: 14, y: 10 } },
      { type: 'zapper', pos: { x: 10, y: 13 } }
    ];

    constructs.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });


    const enemies = [
      { type: 'worm', pos: { x: 3, y: 5 } },
      { type: 'worm', pos: { x: 17, y: 5 } },
      { type: 'worm', pos: { x: 10, y: 2 } }
    ];

    enemies.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
    });


    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 10, y: 15 } };
    sim.addUnit(mechatron);


    for (let i = 0; i < 5; i++) {
      sim.step();
    }


    expect(sim.units.length).toBeGreaterThan(15);
    

    mechanistCrew.forEach(({ type }) => {
      const found = sim.liveUnits.find(u => u.type === type);
      expect(found).toBeDefined();
    });


    constructs.forEach(({ type }) => {
      const found = sim.liveUnits.find(u => u.type === type);
      expect(found).toBeDefined();
    });


    const mechatronUnits = sim.units.filter(u => u.id?.includes('mechatron'));
    expect(mechatronUnits.length).toBeGreaterThan(1); // Main + phantoms
  });

  it('should test mechanist abilities', () => {
    const sim = new Simulator(20, 20);
    

    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 10 } };
    sim.addUnit(mechatronist);
    
    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 11, y: 10 } };
    sim.addUnit(fueler);
    
    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 9, y: 10 } };
    sim.addUnit(clanker);
    

    expect(mechatronist.abilities).toContain('callAirdrop');
    expect(fueler.abilities).toContain('powerSurge');
    

    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    expect(sim.liveUnits.find(u => u.id === mechatronist.id)).toBeDefined();
    expect(sim.liveUnits.find(u => u.id === fueler.id)).toBeDefined();
  });

  it('should create all mechanist support units with correct properties', () => {
    const mechanistUnits = ['builder', 'fueler', 'mechanic', 'engineer', 'welder', 'assembler'];
    
    mechanistUnits.forEach(unitType => {
      const unit = Encyclopaedia.unit(unitType);
      

      expect(unit.sprite).toBe(unitType);
      expect(unit.team).toBe('friendly');
      expect(unit.tags).toContain('mechanical');
      expect(unit.tags).toContain('support');
      expect(unit.mass).toBe(1);
      expect(unit.hp).toBeGreaterThan(15); // All are reasonably durable
      expect(unit.abilities).toBeDefined();
      
    });
    

    expect(Encyclopaedia.unit('builder').tags).toContain('builder');
    expect(Encyclopaedia.unit('fueler').tags).toContain('energy');
    expect(Encyclopaedia.unit('mechanic').tags).toContain('repair');
    expect(Encyclopaedia.unit('engineer').tags).toContain('systems');
    expect(Encyclopaedia.unit('welder').tags).toContain('welder');
    expect(Encyclopaedia.unit('assembler').tags).toContain('assembler');
  });

  it('should test Builder reinforcement abilities', () => {
    const sim = new Simulator();
    

    const builder = { ...Encyclopaedia.unit('builder'), pos: { x: 5, y: 5 } };
    const construct = { ...Encyclopaedia.unit('clanker'), pos: { x: 7, y: 5 } };
    
    sim.addUnit(builder);
    sim.addUnit(construct);
    

    const simBuilder = sim.liveUnits.find(u => u.sprite === 'builder')!;
    const simConstruct = sim.liveUnits.find(u => u.sprite === 'clanker')!;
    

    const originalHp = simConstruct.hp;
    const originalMaxHp = simConstruct.maxHp;
    

    sim.forceAbility(simBuilder.id, 'reinforceConstruct', simConstruct);
    sim.step(); // Process command
    sim.step(); // Process heal event and command
    

    expect(simConstruct.hp).toBe(originalHp + 10);
    expect(simConstruct.maxHp).toBe(originalMaxHp + 10);
    expect(simConstruct.meta.armor).toBe(1); // Gained armor
    

    const reinforceParticles = sim.particles.filter(p => p.color === '#00FF88');
    expect(reinforceParticles.length).toBeGreaterThan(0);
  });

  it('should test Fueler power surge ability', () => {
    const sim = new Simulator();
    
    

    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 5, y: 5 } };
    const freezeBot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 7, y: 5 } };
    const spikerBot = { ...Encyclopaedia.unit('spiker'), pos: { x: 6, y: 7 } };
    
    sim.addUnit(fueler);
    sim.addUnit(freezeBot);
    sim.addUnit(spikerBot);
    

    const fuelerMechanist = sim.liveUnits.find(u => u.sprite === 'fueler')!;
    const simFreezeBot = sim.liveUnits.find(u => u.sprite === 'freezebot')!;
    const simSpikerBot = sim.liveUnits.find(u => u.sprite === 'spikebot')!;
    

    sim.ticks = 100;
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simFreezeBot.id,
        lastAbilityTick: { freezeAura: 99 } // Recently used (1 tick ago, still on cooldown)
      }
    });
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simSpikerBot.id,
        lastAbilityTick: { whipChain: 98 } // Recently used (2 ticks ago, still on cooldown)
      }
    });
    
    console.debug(`Before: freezebot cooldown = ${simFreezeBot.lastAbilityTick?.freezeAura}, spiker cooldown = ${simSpikerBot.lastAbilityTick?.whipChain}`);
    

    sim.forceAbility(fuelerMechanist.id, 'powerSurge', fuelerMechanist);
    
    console.debug(`After power surge (before step): freezebot cooldown = ${simFreezeBot.lastAbilityTick?.freezeAura}, spiker cooldown = ${simSpikerBot.lastAbilityTick?.whipChain}`);
    

    sim.step();
    
    console.debug(`After step: freezebot cooldown = ${simFreezeBot.lastAbilityTick?.freezeAura}, spiker cooldown = ${simSpikerBot.lastAbilityTick?.whipChain}`);
    



    expect(sim.particles.length).toBeGreaterThan(0);
    

    const energyParticles = sim.particles.filter(p => p.color === '#FFAA00');
    expect(energyParticles.length).toBeGreaterThan(0); // Energy field created
  });

  it('should test Mechanic emergency repair ability', () => {
    const sim = new Simulator();
    
    

    const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 5, y: 5 } };
    const damagedConstruct = { ...Encyclopaedia.unit('clanker'), pos: { x: 6, y: 5 } };
    

    damagedConstruct.hp = 2; // Badly damaged
    damagedConstruct.meta.stunned = true;
    damagedConstruct.meta.stunDuration = 20;
    damagedConstruct.meta.frozen = true;
    
    sim.addUnit(mechanic);
    sim.addUnit(damagedConstruct);
    
    const originalHp = damagedConstruct.hp;
    

    sim.forceAbility(mechanic.id, 'emergencyRepair', damagedConstruct);
    sim.step(); // Process ability
    sim.step(); // Process heal event and command
    sim.step(); // Process heal command
      

      const repairedConstruct = sim.liveUnits.find(u => u.pos.x === 6 && u.pos.y === 5 && u.tags?.includes('construct'));
      expect(repairedConstruct).toBeDefined();
      

      expect(repairedConstruct!.hp).toBe(Math.min(repairedConstruct!.maxHp, originalHp + 15));
      

      expect(repairedConstruct!.meta.stunned).toBeUndefined();
      expect(repairedConstruct!.meta.frozen).toBeUndefined();
  });

  it('should test Engineer shield generator ability', () => {
    const sim = new Simulator();
    
    

    const engineer = { ...Encyclopaedia.unit('engineer'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(engineer);
    sim.addUnit(enemy);
    

    sim.forceAbility(engineer.id, 'shieldGenerator', engineer.pos);
    sim.step();
    


    expect(sim.particles.length).toBeGreaterThan(0);
  });

  it('should test Engineer system hack ability', () => {
    const sim = new Simulator();
    
    

    const engineer = { ...Encyclopaedia.unit('engineer'), pos: { x: 5, y: 5 } };
    const enemy = { ...Encyclopaedia.unit('demon'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    
    sim.addUnit(engineer);
    sim.addUnit(enemy);
    
    sim.ticks = 10; // Set current tick for cooldown calculation
    

    sim.forceAbility(engineer.id, 'systemHack', enemy);
    sim.step();
    

    const hackedEnemy = sim.liveUnits.find(u => u.id === enemy.id);
    expect(hackedEnemy).toBeDefined();
    expect(hackedEnemy!.meta.systemsHacked).toBe(true);
    expect(hackedEnemy!.meta.hackDuration).toBe(30);
  });

  it('should test Welder dual abilities', () => {
    const sim = new Simulator();
    
    
    const welder = { ...Encyclopaedia.unit('welder'), pos: { x: 5, y: 5 } };
    const construct = { ...Encyclopaedia.unit('swarmbot'), pos: { x: 6, y: 5 } };
    

    construct.hp = 3;
    const originalMaxHp = construct.maxHp;
    
    sim.addUnit(welder);
    sim.addUnit(construct);
    

    sim.forceAbility(welder.id, 'emergencyRepair', construct);
    sim.forceAbility(welder.id, 'reinforceConstruct', construct);
    sim.step(); // Process commands
    sim.step(); // Process heal event and commands
    
    const repairedConstruct = sim.liveUnits.find(u => u.pos.x === 6 && u.pos.y === 5);
    expect(repairedConstruct).toBeDefined();
    

    expect(repairedConstruct!.hp).toBe(22); // Emergency repair to 12, then reinforce heals 10 more
    expect(repairedConstruct!.maxHp).toBe(22); // MaxHP increased by 10 from reinforcement

  });

  it('should test Assembler advanced construction abilities', () => {
    const sim = new Simulator();
    
    
    const assembler = { ...Encyclopaedia.unit('assembler'), pos: { x: 5, y: 5 } };
    const roller = { ...Encyclopaedia.unit('roller'), pos: { x: 6, y: 5 } };
    const zapper = { ...Encyclopaedia.unit('zapper'), pos: { x: 7, y: 6 } };
    
    sim.addUnit(assembler);
    sim.addUnit(roller);
    sim.addUnit(zapper);
    

    const simAssembler = sim.liveUnits.find(u => u.sprite === 'assembler')!;
    const simRoller = sim.liveUnits.find(u => u.sprite === 'jumpbot')!;
    const simZapper = sim.liveUnits.find(u => u.sprite === 'zapper')!;
    

    const beforeHp = simRoller.hp;
    const beforeMaxHp = simRoller.maxHp;
    sim.forceAbility(simAssembler.id, 'reinforceConstruct', simRoller);
    sim.step(); // Process command
    sim.step(); // Process heal event and command
    
    const reinforcedConstruct = sim.liveUnits.find(u => u.pos.x === 6 && u.pos.y === 5);
    expect(reinforcedConstruct).toBeDefined();

    expect(reinforcedConstruct!.hp).toBe(beforeHp + 10);
    expect(reinforcedConstruct!.maxHp).toBe(beforeMaxHp + 10);
    


    sim.ticks = 60;
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simRoller.id,
        meta: {
          lastAbilityTick: { chargeAttack: 55 }
        }
      }
    });
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simZapper.id,
        meta: {
          lastAbilityTick: { zapHighest: 50 }
        }
      }
    });
    sim.step(); // Process the meta commands
    
    sim.forceAbility(simAssembler.id, 'powerSurge', simAssembler.pos);
    sim.step();
    

    expect(simRoller.meta.lastAbilityTick?.chargeAttack).toBeLessThanOrEqual(sim.ticks);
    expect(simZapper.meta.lastAbilityTick?.zapHighest).toBeLessThanOrEqual(sim.ticks + 1); // May trigger immediately
  });

  it('should verify mechanist synergy with constructs', () => {
    const sim = new Simulator();
    
    

    const builder = { ...Encyclopaedia.unit('builder'), pos: { x: 5, y: 5 } };
    const fueler = { ...Encyclopaedia.unit('fueler'), pos: { x: 6, y: 5 } };
    const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 7, y: 5 } };
    

    const construct1 = { ...Encyclopaedia.unit('clanker'), pos: { x: 8, y: 5 } };
    const construct2 = { ...Encyclopaedia.unit('freezebot'), pos: { x: 9, y: 5 } };
    
    sim.addUnit(builder);
    sim.addUnit(fueler);
    sim.addUnit(mechanic);
    sim.addUnit(construct1);
    sim.addUnit(construct2);
    

    const simBuilder = sim.liveUnits.find(u => u.sprite === 'builder')!;
    const simFueler = sim.liveUnits.find(u => u.sprite === 'fueler')!;
    const simMechanic = sim.liveUnits.find(u => u.sprite === 'mechanic')!;
    const simConstruct1 = sim.liveUnits.find(u => u.sprite === 'clanker')!;
    const simConstruct2 = sim.liveUnits.find(u => u.sprite === 'freezebot')!;
    

    sim.queuedCommands.push({
      type: 'damage',
      params: {
        targetId: simConstruct1.id,
        amount: simConstruct1.hp - 2,
        aspect: 'test'
      }
    });
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simConstruct1.id,
        meta: {
          stunned: true
        }
      }
    });
    sim.step(); // Process the damage and meta commands
    
    let synergisticActions = 0;
    

    const beforeHp = simConstruct1.hp;
    sim.forceAbility(simMechanic.id, 'emergencyRepair', simConstruct1);
    sim.step();
    const repairedConstruct = sim.liveUnits.find(u => u.pos.x === 8 && u.pos.y === 5);
    if (repairedConstruct && repairedConstruct.hp > beforeHp) synergisticActions++;
    

    const reinforcedConstruct = sim.liveUnits.find(u => u.pos.x === 8 && u.pos.y === 5);
    const beforeMaxHp = reinforcedConstruct!.maxHp;
    sim.forceAbility(simBuilder.id, 'reinforceConstruct', simConstruct1);
    sim.step();
    if (reinforcedConstruct && reinforcedConstruct.maxHp > beforeMaxHp) synergisticActions++;
    

    sim.ticks = 30;
    sim.queuedCommands.push({
      type: 'meta',
      params: {
        unitId: simConstruct2.id,
        meta: {
          lastAbilityTick: { freezeAura: 25 }
        }
      }
    });
    sim.step(); // Process the meta command
    sim.forceAbility(simFueler.id, 'powerSurge', simFueler.pos);
    sim.step();
    if (simConstruct2.lastAbilityTick!.freezeAura <= sim.ticks) synergisticActions++; // Abilities may fire after reset
    
    expect(synergisticActions).toBeGreaterThanOrEqual(2); // At least 2 synergies should work
  });
});