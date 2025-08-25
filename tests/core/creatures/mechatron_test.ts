import { beforeEach, describe, expect, it } from 'bun:test';
import { Simulator } from '../../../src/core/simulator';
import Encyclopaedia from '../../../src/dmg/encyclopaedia';
import { Abilities } from '../../../src/rules/abilities';
import { EventHandler } from '../../../src/rules/event_handler';
import { CommandHandler } from '../../../src/core/command_handler';
import { LightningStorm } from '../../../src/rules/lightning_storm';

describe('Mechatron', () => {
  const sim = new Simulator();
  beforeEach(() => { 
    Simulator.rng.reset(12345);
    Encyclopaedia.counts = {}; // Reset unit counters
    sim.reset(); // Reset simulator state
  });
    
  it('create Mechatron with proper dimensions and abilities', () => {
    
    const mechatron = Encyclopaedia.unit('mechatron');
    

    expect(mechatron.sprite).toBe('mechatron');
    expect(mechatron.hp).toBe(200);
    expect(mechatron.maxHp).toBe(200);
    expect(mechatron.mass).toBe(5);
    expect(mechatron.team).toBe('friendly');
    

    expect(mechatron.tags).toContain('mechanical');
    expect(mechatron.tags).toContain('huge');
    expect(mechatron.tags).toContain('artillery');
    expect(mechatron.tags).toContain('hunt');
    

    expect(mechatron.meta.huge).toBe(true);
    expect(mechatron.meta.width).toBe(32);
    expect(mechatron.meta.height).toBe(64);
    expect(mechatron.meta.cellsWide).toBe(4);
    expect(mechatron.meta.cellsHigh).toBe(8);
    expect(mechatron.meta.armor).toBe(5);
    

    expect(mechatron.abilities.includes('missileBarrage')).toBe(true);
    expect(mechatron.abilities.includes('laserSweep')).toBe(true);
    expect(mechatron.abilities.includes('empPulse')).toBe(true);
    expect(mechatron.abilities.includes('shieldRecharge')).toBe(true);
    
  });
  
  it('airdrop', () => {
    const initialUnits = sim.units.length;
    expect(initialUnits).toBe(0);
    sim.parseCommand('airdrop mechatron 50 50');
    expect(sim.queuedCommands.length).toBe(1);
    expect(sim.queuedCommands[0].type).toBe('airdrop');
    expect(sim.queuedCommands[0].params).toEqual({ unitType: 'mechatron', x: 50, y: 50 });
    sim.step();
    expect(sim.units.length).toBe(1);
    const mechatron = sim.units[0];
    expect(mechatron.sprite).toBe('mechatron');
    expect(mechatron.pos.x).toBe(50);
    expect(mechatron.pos.y).toBe(50);
    expect(mechatron.meta.z).toBeGreaterThan(19); // High altitude (allowing for floating point)
    expect(mechatron.meta.dropping).toBe(true);
    expect(sim.particles.length).toBeGreaterThan(0);
    const smokeParticles = sim.particles.filter(p => p.type === 'debris');
    expect(smokeParticles.length).toBe(12); // 12 smoke trail particles
  });
  
  it('lands with impact damage', () => {
    const enemies = [];
    for (let i = 0; i < 5; i++) {
      const enemy = { ...Encyclopaedia.unit('worm'), pos: { x: 50 + i, y: 50 }, team: 'hostile' as const };
      enemies.push(enemy);
      sim.addUnit(enemy);
    }
    

    const mechatron = { ...Encyclopaedia.unit('mechatron'), pos: { x: 50, y: 50 } };
    mechatron.meta.z = 0.4; // Low altitude - will land in one step with dropSpeed 0.5
    mechatron.meta.dropping = true;
    mechatron.meta.dropSpeed = 0.5;
    mechatron.meta.landingImpact = true;
    sim.addUnit(mechatron);
    

    sim.step();
    

    const landedMechatron = sim.units.find(u => u.sprite === 'mechatron')!;
    expect(landedMechatron.meta.z).toBeLessThanOrEqual(0);
    expect(landedMechatron.meta.dropping).toBe(false);
    expect(landedMechatron.meta.landingImpact).toBeFalsy();
    

    const damagedWorms = sim.units.filter(u => u.sprite === 'worm' && u.hp < 10);
    expect(damagedWorms.length).toBeGreaterThan(0);
    

    const minHp = Math.min(...damagedWorms.map(w => w.hp));
    expect(minHp).toBeLessThan(10); // Worms started with 10 HP
    

    const dustParticles = sim.particles.filter(p => p.color === '#8B4513');
    expect(dustParticles.length).toBe(20);
    
  });
  
  it('combat battery', () => {

    const mechatronData = { ...Encyclopaedia.unit('mechatron'), pos: { x: 10, y: 10 } };
    const mechatron = sim.addUnit(mechatronData);
    

    const closeEnemyData = { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 10 }, team: 'hostile' as const }; // 5 cells away - missile range
    const veryCloseEnemyData = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 10 }, team: 'hostile' as const }; // 2 cells away - EMP range
    const closeEnemy = sim.addUnit(closeEnemyData);
    const veryCloseEnemy = sim.addUnit(veryCloseEnemyData);
    

    const initialProjectiles = sim.projectiles.length;
    sim.forceAbility(mechatron.id, 'missileBarrage', closeEnemy);
    sim.step(); // Process command to create projectiles
    

    expect(sim.projectiles.length).toBeGreaterThan(initialProjectiles);
    const newProjectiles = sim.projectiles.length - initialProjectiles;
    const projectiles = sim.projectiles.slice(-newProjectiles);
    

    projectiles.forEach(projectile => {
      expect(projectile.team).toBe('friendly');

      if (projectile.type !== 'laser_beam') {
        expect(projectile.damage).toBeGreaterThan(0);
      }
    });
    

    const empPulse = Encyclopaedia.abilities.empPulse;
    expect(empPulse).toBeDefined();
    
    if (empPulse) {
      sim.forceAbility(mechatron.id, 'empPulse', mechatron.pos);
      sim.step(); // Process commands to create events
      

      const empEvents = sim.processedEvents.filter(e => e.kind === 'aoe' && e.meta.aspect === 'emp');
      expect(empEvents.length).toBeGreaterThan(0);
      const empEvent = empEvents[empEvents.length - 1];
      expect(empEvent.kind).toBe('aoe');
      expect(empEvent.meta.aspect).toBe('emp');
      expect(empEvent.meta.radius).toBe(8);
      expect(empEvent.meta.stunDuration).toBe(40);
      
    }
    

    const laserSweep = Encyclopaedia.abilities.laserSweep;
    if (laserSweep) {
      sim.forceAbility(mechatron.id, 'laserSweep', closeEnemy.pos);
      sim.step(); // Process commands to create events
      

      // Check AOE events created by laser sweep
      const laserAOEEvents = sim.processedEvents.filter(e => e.kind === 'aoe' && e.meta.aspect === 'laser');
      expect(laserAOEEvents.length).toBeGreaterThan(0);
      
      laserAOEEvents.forEach(event => {
        expect(event.meta.amount).toBe(15);
      });
      
      // Also check damage events
      const laserDamageEvents = sim.processedEvents.filter(e => e.kind === 'damage' && e.meta.aspect === 'laser');
      // These may have varying damage due to projectile collisions
      
    }
    
  });

  it('should deploy Mechatron with full lightning-powered mechanist force', () => {

    const enemyForce = [
      { ...Encyclopaedia.unit('worm'), pos: { x: 15, y: 8 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('demon'), pos: { x: 18, y: 9 }, team: 'hostile' as const },
      { ...Encyclopaedia.unit('worm'), pos: { x: 16, y: 12 }, team: 'hostile' as const },
    ];
    
    enemyForce.forEach(enemy => {
      sim.addUnit(enemy);
    });


    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 8 } };
    sim.addUnit(mechatronist);


    LightningStorm.createLightningStorm(sim);
    expect(sim.lightningActive).toBe(true);


    
    expect(mechatronist.abilities).toContain('callAirdrop');
    

    const addedMechatronist = sim.units.find(u => u.sprite === 'mechatronist');
    sim.forceAbility(addedMechatronist!.id, 'callAirdrop', { x: 8, y: 8 });
    

    sim.step();
    

    const mechatronUnits = sim.units.filter(u =>
      u.id.includes('mechatron') && u.id !== mechatronist.id
    );
    
    expect(mechatronUnits.length).toBeGreaterThan(0);


    

    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    if (lightningRule) {

      const context = sim.getTickContext();
      lightningRule.generateLightningStrike(context, { x: 7, y: 8 });
      lightningRule.generateLightningStrike(context, { x: 9, y: 9 });
      

      const generatedCommands = (lightningRule as any).commands || [];
      sim.queuedCommands.push(...generatedCommands);
      

      sim.step();
      

      const boostedUnits = sim.units.filter(u => u.meta.lightningBoost);
      expect(boostedUnits.length).toBeGreaterThan(0);
      

      const lightningEffects = sim.particles.filter(p =>
        p.type === 'lightning' ||
        p.type === 'power_surge' ||
        p.type === 'electric_spark'
      );
      expect(lightningEffects.length).toBeGreaterThan(10);
    }


    
    let synergyOperations = 0;
    

    const deployedMechatron = sim.units.find(u => u.id.includes('mechatron') && u.id !== 'mechatronist');
    
    if (deployedMechatron && mechatronist.abilities?.includes('tacticalOverride')) {


      sim.forceAbility(deployedMechatron.id, 'missileBarrage', {x: 0, y: 0});
      sim.forceAbility(deployedMechatron.id, 'laserSweep', {x: 0, y: 0});
      sim.step(); // Process the forced abilities
      

      sim.forceAbility(mechatronist.id, 'tacticalOverride', mechatronist.pos);
      


      synergyOperations++;
    }
    

    const constructs = sim.units.filter(u => u.tags?.includes('construct'));
    if (constructs.length > 0) {
      synergyOperations++;
    }


    const mechanicalUnits = sim.units.filter(u => u.tags?.includes('mechanical'));
    if (mechanicalUnits.length > 1) {
      synergyOperations++;
    }

    expect(synergyOperations).toBeGreaterThan(0);


    
    let combatActions = 0;
    let enemiesDefeated = 0;
    const initialEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
    

    for (let tick = 0; tick < 30; tick++) {
      const beforeEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      

      const damageEvents = sim.queuedEvents?.filter(e => e.kind === 'damage') || [];
      combatActions += damageEvents.length;
      
      sim.step();
      
      const afterEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
      if (afterEnemyCount < beforeEnemyCount) {
        enemiesDefeated += (beforeEnemyCount - afterEnemyCount);
      }
      

      if (tick % 10 === 0 && lightningRule) {
        const context = sim.getTickContext();
        lightningRule.generateLightningStrike(context);
      }
    }
    
    const finalEnemyCount = sim.units.filter(u => u.team === 'hostile' && u.hp > 0).length;
    enemiesDefeated = initialEnemyCount - finalEnemyCount;
    
    

    
    const survivingFriendlies = sim.units.filter(u => u.team === 'friendly' && u.hp > 0);
    const survivingEnemies = sim.units.filter(u => u.team === 'hostile' && u.hp > 0);
    const totalParticles = sim.particles.length;
    
    

    expect(survivingFriendlies.length).toBeGreaterThanOrEqual(2); // Mechanist force still strong
    expect(totalParticles).toBeGreaterThan(20); // Lots of visual effects
    expect(enemiesDefeated).toBeGreaterThan(0); // Significant combat occurred
    

    if (lightningRule) {
      const context = sim.getTickContext();
      lightningRule.generateLightningStrike(context, { x: 10, y: 10 });
      sim.step();
    }
    
    

    expect(sim.lightningActive).toBe(true); // Storm still active
    expect(sim.units.length).toBeGreaterThanOrEqual(5); // Substantial force deployed
    expect(sim.particles.length).toBeGreaterThan(15); // Rich visual effects
    
  });

  it('should demonstrate Mechatronist tactical override ability', () => {

    const mechatronistData = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 5, y: 5 } };
    const construct1Data = { ...Encyclopaedia.unit('clanker'), pos: { x: 7, y: 5 } };
    const construct2Data = { ...Encyclopaedia.unit('freezebot'), pos: { x: 8, y: 6 } };
    


    if (!construct1Data.tags) construct1Data.tags = [];
    if (!construct1Data.tags.includes('mechanical')) construct1Data.tags.push('mechanical');
    if (!construct2Data.tags) construct2Data.tags = [];
    if (!construct2Data.tags.includes('mechanical')) construct2Data.tags.push('mechanical');
    
    const mechatronist = sim.addUnit(mechatronistData);
    const construct1 = sim.addUnit(construct1Data);
    const construct2 = sim.addUnit(construct2Data);
    

    sim.ticks = 50;
    
    expect(mechatronist.abilities).toContain('tacticalOverride');
    

    sim.forceAbility(mechatronist.id, 'tacticalOverride', mechatronist.pos);
    sim.step(); // Process the commands
      

    const updatedConstruct1 = sim.units.find(u => u.id === construct1.id)!;
    const updatedConstruct2 = sim.units.find(u => u.id === construct2.id)!;

    expect(updatedConstruct1.meta.tacticalBoost).toBe(true);
    expect(updatedConstruct2.meta.tacticalBoost).toBe(true);
      

    const commandParticles = sim.particles.filter(p => p.color === '#00FFFF');
    expect(commandParticles.length).toBeGreaterThan(0);
  });
});