import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { CommandHandler } from '../src/rules/command_handler';
import { Abilities } from '../src/rules/abilities';
import { EventHandler } from '../src/rules/event_handler';
import { LightningStorm } from '../src/rules/lightning_storm';

describe('Mechanist Showcase - Visual Test', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  it('should deploy the complete mechanist force for visual testing', () => {
    console.log('🤖 MECHANIST FORCE SHOWCASE 🤖');
    
    const sim = new Simulator();
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new EventHandler(sim),
      new LightningStorm(sim)
    ];

    console.log('⚙️ Deploying mechanist leadership...');
    
    // Deploy Mechatronist commander
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 5 } };
    sim.addUnit(mechatronist);
    console.log(`🤖 ${mechatronist.id} (Leader) deployed at (${mechatronist.pos.x}, ${mechatronist.pos.y})`);

    console.log('\n🔧 Deploying mechanist support crew...');
    
    // Deploy all mechanist support units in formation
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
      console.log(`🔧 ${unit.id} (${type}) deployed at (${pos.x}, ${pos.y})`);
    });

    console.log('\n🏗️ Adding some constructs to support...');
    
    // Add some constructs for the mechanists to work with
    const constructs = [
      { type: 'clanker', pos: { x: 6, y: 8 } },
      { type: 'freezebot', pos: { x: 14, y: 8 } },
      { type: 'swarmbot', pos: { x: 10, y: 13 } }
    ];

    constructs.forEach(({ type, pos }) => {
      const unit = { ...Encyclopaedia.unit(type), pos };
      sim.addUnit(unit);
      console.log(`🤖 ${unit.id} (${type}) deployed at (${pos.x}, ${pos.y})`);
    });

    // Verify all units deployed correctly
    const totalUnits = sim.units.length;
    expect(totalUnits).toBe(10); // 1 mechatronist + 6 support + 3 constructs
    
    // Verify each mechanist type is present
    const mechanistTypes = ['mechatronist', 'builder', 'fueler', 'mechanic', 'engineer', 'welder', 'assembler'];
    mechanistTypes.forEach(type => {
      const unit = sim.units.find(u => u.id.includes(type));
      expect(unit).toBeDefined();
      console.log(`✅ ${type} unit confirmed: ${unit?.id} with sprite '${unit?.sprite}'`);
    });

    console.log('\n⚡ Adding lightning storm for dramatic effect...');
    
    // Activate lightning storm
    LightningStorm.createLightningStorm(sim);
    
    // Strike near the mechanist formation
    sim.queuedCommands = [{ type: 'lightning', args: ['10', '8'] }];
    sim.step();
    
    const lightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || p.type === 'lightning_branch' || p.type === 'electric_spark'
    );
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    console.log(`⚡ Lightning effects active: ${lightningParticles.length} particles`);

    console.log('\n🎯 Testing mechanist abilities...');
    
    // Test a few key abilities to show they work
    const builder = sim.units.find(u => u.id.includes('builder'));
    const construct = sim.units.find(u => u.id.includes('clanker'));
    
    if (builder?.abilities?.reinforceConstruct && construct) {
      const beforeHp = construct.hp;
      builder.abilities.reinforceConstruct.effect(builder, construct.pos, sim);
      expect(construct.hp).toBeGreaterThan(beforeHp);
      console.log(`🔨 ${builder.id} reinforced ${construct.id}: ${beforeHp}→${construct.hp}hp`);
    }

    const fueler = sim.units.find(u => u.id.includes('fueler'));
    if (fueler?.abilities?.powerSurge) {
      const mechanicalUnits = sim.units.filter(u => u.tags?.includes('mechanical'));
      mechanicalUnits.forEach(unit => {
        if (!unit.lastAbilityTick) unit.lastAbilityTick = {};
        unit.lastAbilityTick.testAbility = sim.tick - 30; // Add some cooldowns
      });
      
      fueler.abilities.powerSurge.effect(fueler, fueler.pos, sim);
      
      const rechargedUnits = mechanicalUnits.filter(u => 
        u.lastAbilityTick?.testAbility === 0
      );
      console.log(`⚡ ${fueler.id} recharged ${rechargedUnits.length} mechanical units`);
    }

    console.log('\n📊 MECHANIST SHOWCASE COMPLETE:');
    console.log(`   Total units: ${sim.units.length}`);
    console.log(`   Mechanist units: ${sim.units.filter(u => u.tags?.includes('mechanical')).length}`);
    console.log(`   Lightning particles: ${lightningParticles.length}`);
    console.log(`   Support particles: ${sim.particles.filter(p => p.color === '#00FF88').length}`);
    
    console.log('\n🎨 VISUAL VERIFICATION:');
    console.log('   All mechanist sprites should be visible with correct positioning');
    console.log('   Lightning effects should be active around the formation');
    console.log('   Support abilities should show particle effects');
    
    expect(sim.units.length).toBeGreaterThan(5);
    expect(sim.lightningActive).toBe(true);
    expect(sim.particles.length).toBeGreaterThan(10);
  });

  it('should demonstrate mechanist abilities in sequence', () => {
    console.log('🔄 Testing mechanist ability sequence...');
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler(sim)];
    
    // Create a focused test scene
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const builder = { ...Encyclopaedia.unit('builder'), pos: { x: 6, y: 5 } };
    const mechanic = { ...Encyclopaedia.unit('mechanic'), pos: { x: 7, y: 5 } };
    const construct = { ...Encyclopaedia.unit('clanker'), pos: { x: 8, y: 5 } };
    
    // Damage the construct to test repair
    construct.hp = 3;
    
    sim.addUnit(mechatronist);
    sim.addUnit(builder);
    sim.addUnit(mechanic);
    sim.addUnit(construct);
    
    let actionsPerformed = 0;
    
    // Test sequence: Repair → Reinforce → Tactical Override
    if (mechanic.abilities?.emergencyRepair) {
      const beforeHp = construct.hp;
      mechanic.abilities.emergencyRepair.effect(mechanic, construct.pos, sim);
      const actualConstruct = sim.units.find(u => u.pos.x === 8 && u.pos.y === 5);
      if (actualConstruct && actualConstruct.hp > beforeHp) {
        actionsPerformed++;
        console.log(`✅ Emergency repair: ${beforeHp}→${actualConstruct.hp}hp`);
      }
    }
    
    if (builder.abilities?.reinforceConstruct) {
      const actualConstruct = sim.units.find(u => u.pos.x === 8 && u.pos.y === 5);
      const beforeMaxHp = actualConstruct?.maxHp || 0;
      builder.abilities.reinforceConstruct.effect(builder, construct.pos, sim);
      if (actualConstruct && actualConstruct.maxHp > beforeMaxHp) {
        actionsPerformed++;
        console.log(`✅ Reinforcement: max hp ${beforeMaxHp}→${actualConstruct.maxHp}`);
      }
    }
    
    if (mechatronist.abilities?.tacticalOverride) {
      mechatronist.abilities.tacticalOverride.effect(mechatronist, mechatronist.pos, sim);
      const boostedUnits = sim.units.filter(u => u.meta.tacticalBoost);
      if (boostedUnits.length > 0) {
        actionsPerformed++;
        console.log(`✅ Tactical override: ${boostedUnits.length} units boosted`);
      }
    }
    
    expect(actionsPerformed).toBeGreaterThan(0);
    console.log(`🎯 Mechanist coordination: ${actionsPerformed}/3 abilities working`);
  });
});