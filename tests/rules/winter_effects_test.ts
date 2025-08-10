import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { WinterEffects } from '../../src/rules/winter_effects';
import { Perdurance } from '../../src/rules/perdurance';
import { EventHandler } from '../../src/rules/event_handler';

describe('Winter Effects System', () => {
  it('should generate snowfall particles', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    const initialParticleCount = sim.particles.length;
    
    // Run a few ticks to generate snowfall
    for (let i = 0; i < 6; i++) { // Snowfall happens every 3 ticks
      sim.step();
    }
    
    expect(sim.particles.length).toBeGreaterThan(initialParticleCount);
    
    // Check that snow particles have correct properties
    const snowParticles = sim.particles.filter(p => p.type === 'snow');
    expect(snowParticles.length).toBeGreaterThan(0);
    expect(snowParticles[0].color).toBe('#FFFFFF');
    expect(snowParticles[0].vel.y).toBeGreaterThan(0); // Falling down
  });

  it('should create winter storm and lower temperatures', () => {
    const sim = new Simulator();
    
    // Check initial temperature (should be around 20°C)
    const initialTemp = sim.temperatureField.get(10, 10);
    expect(initialTemp).toBe(20);
    
    // Create winter storm
    WinterEffects.createWinterStorm(sim);
    
    // Temperature should be much lower
    const coldTemp = sim.temperatureField.get(10, 10);
    expect(coldTemp).toBeLessThan(10);
    expect(coldTemp).toBeGreaterThanOrEqual(-5); // Capped at -5
    expect(sim.winterActive).toBe(true);
  });

  it('should freeze units in sub-zero temperatures', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    // Add a unit
    const unit = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 10 } };
    sim.addUnit(unit);
    
    // Set temperature to freezing
    sim.temperatureField.set(10, 10, -2);
    
    // Run winter effects
    sim.step();
    
    const frozenUnit = sim.units.find(u => u.id === unit.id);
    expect(frozenUnit?.meta.frozen).toBe(true);
    expect(frozenUnit?.meta.brittle).toBe(true);
    expect(frozenUnit?.meta.stunned).toBe(true);
    expect(frozenUnit?.meta.frozenDuration).toBeGreaterThan(0);
  });

  it('should chill units in cold (but not freezing) temperatures', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    // Add a unit
    const unit = { ...Encyclopaedia.unit('farmer'), pos: { x: 5, y: 5 } };
    sim.addUnit(unit);
    
    // Set temperature to cold but not freezing
    sim.temperatureField.set(5, 5, 2);
    
    // Run winter effects
    sim.step();
    
    const chilledUnit = sim.units.find(u => u.id === unit.id);
    expect(chilledUnit?.meta.statusEffects).toBeDefined();
    
    const chillEffect = chilledUnit?.meta.statusEffects?.find(effect => effect.type === 'chill');
    expect(chillEffect).toBeDefined();
    expect(chillEffect?.intensity).toBe(0.3); // 30% slow from winter
    expect(chillEffect?.source).toBe('winter');
  });

  it('should thaw frozen units when temperature rises', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    // Add a unit and freeze it
    const unit = { ...Encyclopaedia.unit('priest'), pos: { x: 8, y: 8 } };
    sim.addUnit(unit);
    
    // Freeze the unit
    sim.temperatureField.set(8, 8, -3);
    sim.step();
    
    expect(sim.units.find(u => u.id === unit.id)?.meta.frozen).toBe(true);
    
    // Warm up the temperature
    sim.temperatureField.set(8, 8, 10);
    sim.step();
    
    const thawedUnit = sim.units.find(u => u.id === unit.id);
    expect(thawedUnit?.meta.frozen).toBeFalsy();
    expect(thawedUnit?.meta.brittle).toBeFalsy();
    expect(thawedUnit?.meta.stunned).toBeFalsy();
  });

  it('should make brittle (frozen) units take double damage', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim), new Perdurance(sim), new EventHandler(sim)];
    
    // Add a construct (has sturdiness perdurance)
    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 10, y: 10 } };
    sim.addUnit(construct);
    
    // Freeze the construct
    sim.temperatureField.set(10, 10, -5);
    sim.step();
    
    expect(sim.units.find(u => u.id === construct.id)?.meta.frozen).toBe(true);
    
    // Apply damage
    sim.queuedEvents.push({
      kind: 'damage',
      source: 'test',
      target: construct.id,
      meta: {
        aspect: 'impact',
        amount: 4
      }
    });
    
    const initialHp = construct.hp;
    
    // Process damage
    sim.step();
    
    const damagedUnit = sim.units.find(u => u.id === construct.id);
    // Sturdiness reduces 4 damage to 1, but brittle doubles it to 2
    expect(damagedUnit?.hp).toBe(initialHp - 2);
  });

  it('should end winter storm and warm up temperatures', () => {
    const sim = new Simulator();
    
    // Create and then end winter storm
    WinterEffects.createWinterStorm(sim);
    expect(sim.winterActive).toBe(true);
    
    const coldTemp = sim.temperatureField.get(15, 15);
    expect(coldTemp).toBeLessThan(10);
    
    WinterEffects.endWinterStorm(sim);
    expect(sim.winterActive).toBe(false);
    
    const warmerTemp = sim.temperatureField.get(15, 15);
    expect(warmerTemp).toBeGreaterThan(coldTemp);
    expect(warmerTemp).toBeLessThanOrEqual(20); // Capped at 20
  });

  it('should prevent frozen units from moving', () => {
    const sim = new Simulator();
    sim.rulebook = [new WinterEffects(sim)];
    
    // Add a unit with intended movement
    const unit = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 }, intendedMove: { x: 1, y: 0 } };
    sim.addUnit(unit);
    
    // Freeze the unit
    sim.temperatureField.set(5, 5, -1);
    sim.step();
    
    const frozenUnit = sim.units.find(u => u.id === unit.id);
    expect(frozenUnit?.meta.frozen).toBe(true);
    expect(frozenUnit?.intendedMove).toEqual({ x: 0, y: 0 }); // Movement cleared
  });
});