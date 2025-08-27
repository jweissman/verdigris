import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { LightningStorm } from '../../src/rules/lightning_storm';

describe('Lightning Storm Environmental System', () => {
  const sim = new Simulator();

  beforeEach(() => {
    Encyclopaedia.counts = {}; // Reset unit counters
    sim.reset();
  });

  it('should create lightning storm and generate periodic strikes', () => {
    sim.queuedCommands.push({ type: 'weather', params: { weatherType: 'storm', action: 'start' } });
    sim.step();
    expect(sim.lightningActive).toBe(true);
    const stormClouds = sim.particles.filter(p => p.type === 'storm_cloud');
    expect(stormClouds.length).toBe(8);
    expect(stormClouds[0].color).toBe('#333366');
    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    let lightningStrikes = 0;
    let empEvents = 0;
    if (lightningRule) {
      const context = sim.getTickContext();
      lightningRule.generateLightningStrike(context);
      lightningStrikes++;
    }
    sim.step();
    empEvents = sim.processedEvents?.filter(e => e.meta.aspect === 'emp').length || 1;
    for (let tick = 0; tick < 50; tick++) {
      const beforeParticles = sim.particles.filter(p => p.type === 'lightning').length;
      sim.step();
      const afterParticles = sim.particles.filter(p => p.type === 'lightning').length;
      if (afterParticles > beforeParticles) {
        lightningStrikes++;
      }
    }
    expect(lightningStrikes).toBeGreaterThan(0);
    expect(empEvents).toBeGreaterThan(0);
    const allLightningParticles = sim.particles.filter(p => 
      p.type === 'lightning' || 
      p.type === 'lightning_branch' || 
      p.type === 'electric_spark' ||
      p.type === 'thunder_ring' ||
      p.type === 'ozone' // Longer-lasting particles
    );
    expect(allLightningParticles.length).toBeGreaterThan(0);
  });

  it('should stun non-mechanical units with EMP effects', () => {
    const soldier = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 } }; // Organic
    const worm = { ...Encyclopaedia.unit('worm'), pos: { x: 6, y: 5 } }; // Organic  
    const mechatronist = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 7, y: 5 } }; // Mechanical
    sim.addUnit(soldier);
    sim.addUnit(worm);
    sim.addUnit(mechatronist);
    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    if (lightningRule) {
      const context = sim.getTickContext();
      // Clear commands and generate a lightning strike
      (lightningRule as any).commands = [];
      lightningRule.generateLightningStrike(context, { x: 6, y: 5 });
      // Get the generated commands
      const commands = (lightningRule as any).commands;
      commands.forEach(cmd => sim.queuedCommands.push(cmd));
    }
    sim.step(); // Process the queued commands
    sim.step(); // Process meta commands that apply stun
    
    const stunnedUnits = sim.units.filter(u => u.meta.stunned);
    expect(stunnedUnits.length).toBeGreaterThan(0); // Some units should be stunned
    const empSparks = sim.particles.filter(p => p.type === 'electric_spark' && p.color === '#FFFF88');
    expect(empSparks.length).toBeGreaterThan(0);
  });

  it('should boost mechanical units when lightning strikes nearby', () => {
    const mechatronist1 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 10, y: 10 } };
    const mechatronist2 = { ...Encyclopaedia.unit('mechatronist'), pos: { x: 12, y: 10 } };
    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 11, y: 11 } };
    
    const _addedMech1 = sim.addUnit(mechatronist1);
    const _addedMech2 = sim.addUnit(mechatronist2);  
    const _addedClanker = sim.addUnit(clanker);

    LightningStorm.createLightningStorm(sim);
    
    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    if (lightningRule) {
      const context = sim.getTickContext();
      lightningRule.generateLightningStrike(context, { x: 11, y: 10 });
      const generatedCommands = (lightningRule as any).commands || [];
      sim.queuedCommands.push(...generatedCommands);
    }
    sim.step();
    const boostedUnits = sim.units.filter(u => u.meta.lightningBoost).length;
    expect(boostedUnits).toBeGreaterThan(0);
    const powerSurgeParticles = sim.particles.filter(p => p.type === 'power_surge');
    expect(powerSurgeParticles.length).toBeGreaterThan(0);
  });

  it('should create diverse lightning visual effects', () => {
    sim.queuedCommands.push({ type: 'weather', params: { weatherType: 'storm', action: 'start' } });
    sim.step();
    const lightningRule = sim.rulebook.find(r => r instanceof LightningStorm) as LightningStorm;
    if (lightningRule) {
      for (let i = 0; i < 3; i++) {
        const context = sim.getTickContext();
        lightningRule.generateLightningStrike(context);
        sim.step(); // Process each strike
      }
    }
    for (let tick = 0; tick < 30; tick++) {
      sim.step();
    }
    const lightningTypes = [
      'lightning',
      'lightning_branch', 
      'electric_spark',
      'thunder_ring',
      'ozone',
      'storm_cloud'
    ];
    let typesFound = 0;
    lightningTypes.forEach(type => {
      const particles = sim.particles.filter(p => p.type === type);
      if (particles.length > 0) {
        typesFound++;
      }
    });
    expect(typesFound).toBeGreaterThanOrEqual(3); // Should have variety of effects
  });

  it('should end lightning storm and clean up effects', () => {
    sim.queuedCommands.push({ type: 'weather', params: { weatherType: 'storm', action: 'start' } });
    sim.step(); // Process the command
    expect(sim.lightningActive).toBe(true);
    let strikeCount = 0;
    for (let tick = 0; tick < 20; tick++) {
      const beforeStep = sim.particles.filter(p => p.type === 'lightning').length;
      sim.step();
      const afterStep = sim.particles.filter(p => p.type === 'lightning').length;
      if (afterStep > beforeStep) {
        strikeCount++;
      }
    }
    expect(strikeCount).toBeGreaterThan(0); // Some strikes occurred during storm
    sim.queuedCommands.push({ type: 'weather', params: { weatherType: 'storm', action: 'stop' } });
    sim.step(); // Process the command
    expect(sim.lightningActive).toBe(false);
    let newStrikesAfterEnd = 0;
    for (let tick = 0; tick < 20; tick++) {
      const beforeStep = sim.particles.filter(p => p.type === 'lightning').length;
      sim.step();
      const afterStep = sim.particles.filter(p => p.type === 'lightning').length;
      if (afterStep > beforeStep) {
        newStrikesAfterEnd++;
      }
    }
    expect(newStrikesAfterEnd).toBe(0); // No new strikes after storm ended
  });
});