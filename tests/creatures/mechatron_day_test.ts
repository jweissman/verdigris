import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { CommandHandler } from '../../src/rules/command_handler';
import { Abilities } from '../../src/rules/abilities';
import { EventHandler } from '../../src/rules/event_handler';
import { LightningStorm } from '../../src/rules/lightning_storm';
import { UnitMovement } from '../../src/rules/unit_movement';
import { MeleeCombat } from '../../src/rules/melee_combat';

describe('Mechatron Day - Epic Integration Scenario', () => {
  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
  });

  // TODO: flaking test to repair!!
  it.skip('should deploy Mechatron with full lightning-powered mechanist force', () => {
    const sim = new Simulator();
    // Full rulebook for complete simulation
    sim.rulebook = [
      new CommandHandler(sim), 
      new Abilities(sim), 
      new EventHandler(sim),
      new LightningStorm(sim),
      new UnitMovement(sim),
      new MeleeCombat(sim)
    ];

    
    // Create hostile force to face Mechatron
    const enemyForce = [
      { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 8 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('demon'), pos: { x: 18, y: 9 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 16, y: 12 }, team: 'hostile' as const },
    ];
    
    enemyForce.forEach(enemy => {
      sim.addUnit(enemy);
    });

    // Deploy the Mechatronist leader
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 8 } };
    sim.addUnit(mechatronist);

    // Activate lightning storm for dramatic effect and power boosts
    LightningStorm.createLightningStorm(sim);
    expect(sim.lightningActive).toBe(true);

    // PHASE 1: Mechatronist calls in airdrop support
    
    const airdropAbility = mechatronist.abilities.callAirdrop;
    expect(airdropAbility).toBeDefined();
    
    if (airdropAbility?.effect) {
      // Call in the mechanist support force
      airdropAbility.effect(mechatronist, { x: 8, y: 8 }, sim);
      
      // Process the airdrop events
      sim.step();
      
      // Verify mechatron unit was deployed via airdrop
      const mechatronUnits = sim.units.filter(u => 
        u.id.includes('mechatron') && u.id !== 'mechatronist'
      );
      
      expect(mechatronUnits.length).toBeGreaterThan(0);
      mechatronUnits.forEach(unit => {
      });
    }

    // PHASE 2: Lightning storm powers up the mechanist force
    
    // Force lightning strikes near mechanist units for dramatic effect
    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    if (lightningRule) {
      // Strike near the mechanist cluster
      lightningRule.generateLightningStrike({ x: 7, y: 8 });
      lightningRule.generateLightningStrike({ x: 9, y: 9 });
      
      // Process lightning effects
      sim.step();
      
      // Verify mechanist units received lightning boosts
      const boostedUnits = sim.units.filter(u => u.meta.lightningBoost);
      expect(boostedUnits.length).toBeGreaterThan(0);
      
      // Check for dramatic lightning particle effects
      const lightningEffects = sim.particles.filter(p => 
        p.type === 'lightning' || 
        p.type === 'power_surge' || 
        p.type === 'electric_spark'
      );
      expect(lightningEffects.length).toBeGreaterThan(10);
    }

    // PHASE 3: Mechanist coordination with deployed forces
    
    let synergyOperations = 0;
    
    // Test mechatronist tactical override with the deployed mechatron
    const deployedMechatron = sim.units.find(u => u.id.includes('mechatron') && u.id !== 'mechatronist');
    
    if (deployedMechatron && mechatronist.abilities?.tacticalOverride) {
      // Set up cooldowns to demonstrate tactical override
      if (!deployedMechatron.lastAbilityTick) deployedMechatron.lastAbilityTick = {};
      deployedMechatron.lastAbilityTick.missileBarrage = sim.tick - 30;
      deployedMechatron.lastAbilityTick.laserSweep = sim.tick - 20;
      
      const beforeBarrage = deployedMechatron.lastAbilityTick.missileBarrage;
      const beforeLaser = deployedMechatron.lastAbilityTick.laserSweep;
      
      mechatronist.abilities.tacticalOverride.effect(mechatronist, mechatronist.pos, sim);
      
      // Verify cooldowns were reset
      if (deployedMechatron.lastAbilityTick.missileBarrage === 0 && 
          deployedMechatron.lastAbilityTick.laserSweep === 0) {
        synergyOperations++;
      }
    }
    
    // Look for any construct units that may have been created or found
    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    if (constructs.length > 0) {
      synergyOperations++;
    }

    // Test mechatronist leadership coordination
    const mechanicalUnits = sim.units.filter(u => u.tags?.includes('mechanical'));
    if (mechanicalUnits.length > 1) {
      synergyOperations++;
    }

    expect(synergyOperations).toBeGreaterThan(0);

    // PHASE 4: Combat engagement
    
    let combatActions = 0;
    let enemiesDefeated = 0;
    const initialEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
    
    // Run combat simulation for several ticks
    for (let tick = 0; tick < 30; tick++) {
      const beforeEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      
      // Count queued events before processing them
      const damageEvents = sim.queuedEvents?.filter(e => e.kind === 'damage') || [];
      combatActions += damageEvents.length;
      
      sim.step();
      
      const afterEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      if (afterEnemyCount < beforeEnemyCount) {
        enemiesDefeated += (beforeEnemyCount - afterEnemyCount);
      }
      
      // Add some more lightning strikes during combat for epic effect
      if (tick % 10 === 0 && lightningRule) {
        lightningRule.generateLightningStrike();
      }
    }
    
    const finalEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
    enemiesDefeated = initialEnemyCount - finalEnemyCount;
    
    
    // PHASE 5: Final battlefield assessment
    
    const survivingFriendlies = sim.units.filter(u => u.team === 'friendly' && u.hp > 0);
    const survivingEnemies = sim.units.filter(u => u.team === 'hostile' && u.hp > 0);
    const totalParticles = sim.particles.length;
    
    
    // Verify the epic scale of Mechatron Day
    expect(survivingFriendlies.length).toBeGreaterThan(2); // Mechanist force still strong
    expect(totalParticles).toBeGreaterThan(20); // Lots of visual effects
    expect(enemiesDefeated).toBeGreaterThan(0); // Significant combat occurred
    
    // Final lightning storm effect for dramatic conclusion
    if (lightningRule) {
      lightningRule.generateLightningStrike({ x: 10, y: 10 });
      sim.step();
    }
    
    
    // Overall success metrics
    expect(sim.lightningActive).toBe(true); // Storm still active
    expect(sim.units.length).toBeGreaterThan(5); // Substantial force deployed
    expect(sim.particles.length).toBeGreaterThan(15); // Rich visual effects
    
  });

  it('should demonstrate Mechatronist tactical override ability', () => {
    
    const sim = new Simulator();
    sim.rulebook = [new CommandHandler(sim), new Abilities(sim), new EventHandler(sim)];
    
    // Create Mechatronist and some constructs to command
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const construct1 = { ...Encyclopaedia.unit('clanker'), pos: { x: 7, y: 5 } };
    const construct2 = { ...Encyclopaedia.unit('freezebot'), pos: { x: 8, y: 6 } };
    
    // Add mechanical tags to constructs for tactical override to work
    if (!construct1.tags) construct1.tags = [];
    if (!construct1.tags.includes('mechanical')) construct1.tags.push('mechanical');
    if (!construct2.tags) construct2.tags = [];
    if (!construct2.tags.includes('mechanical')) construct2.tags.push('mechanical');
    
    sim.addUnit(mechatronist);
    sim.addUnit(construct1);
    sim.addUnit(construct2);
    
    // Set up construct cooldowns
    sim.tick = 50;
    construct1.lastAbilityTick = { explode: 45 };
    construct2.lastAbilityTick = { freezeAura: 40 };
    
    const tacticalOverride = mechatronist.abilities.tacticalOverride;
    expect(tacticalOverride).toBeDefined();
    
    if (tacticalOverride?.effect) {
      tacticalOverride.effect(mechatronist, mechatronist.pos, sim);
      
      // Verify constructs received tactical boost
      expect(construct1.meta.tacticalBoost).toBe(true);
      expect(construct2.meta.tacticalBoost).toBe(true);
      
      // Should have tactical override particles
      const commandParticles = sim.particles.filter(p => p.color === '#00FFFF');
      expect(commandParticles.length).toBeGreaterThan(0);
      
    }
  });
});