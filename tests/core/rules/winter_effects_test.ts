import { describe, expect, it, beforeEach } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { BiomeEffects } from '../../src/rules/biome_effects';
import { Perdurance } from '../../src/rules/perdurance';
import { EventHandler } from '../../src/rules/event_handler';
import { CommandHandler } from '../../src/core/command_handler';

describe('Winter Effects System (BiomeEffects)', () => {
  beforeEach(() => {

    Encyclopaedia.counts = {};
  });
  
  it('should generate snowfall particles', () => {
    const sim = new Simulator();


    sim.winterActive = true;
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        sim.temperatureField.set(x, y, -5);
      }
    }
    
    const initialParticleCount = sim.particles.length;
    

    for (let i = 0; i < 6; i++) { // Snowfall happens every 3 ticks
      sim.step();
    }
    
    expect(sim.particles.length).toBeGreaterThan(initialParticleCount);
    

    const snowParticles = sim.particles.filter(p => p.type === 'snow');
    expect(snowParticles.length).toBeGreaterThan(0);
    expect(snowParticles[0].color).toBe('#FFFFFF');
    expect(snowParticles[0].vel.y).toBeGreaterThan(0); // Falling down
  });

  it('should create winter storm and lower temperatures', () => {
    const sim = new Simulator();
    

    const initialTemp = sim.temperatureField.get(10, 10);
    expect(initialTemp).toBe(20);
    

    sim.winterActive = true;
    for (let x = 0; x < sim.fieldWidth; x++) {
      for (let y = 0; y < sim.fieldHeight; y++) {
        sim.temperatureField.set(x, y, -5);
      }
    }
    

    const coldTemp = sim.temperatureField.get(10, 10);
    expect(coldTemp).toBeLessThan(10);
    expect(coldTemp).toBeGreaterThanOrEqual(-5); // Capped at -5
    expect(sim.winterActive).toBe(true);
  });

  it('should freeze units in sub-zero temperatures', () => {
    const sim = new Simulator();
    const CommandHandler = require('../../src/core/command_handler').CommandHandler;

    

    const unit = { ...Encyclopaedia.unit('soldier'), pos: { x: 10, y: 10 } };
    const addedUnit = sim.addUnit(unit);
    const actualId = addedUnit.id;  // Get actual ID from returned proxy
    

    sim.temperatureField.set(10, 10, -2);
    

    const temp = sim.temperatureField.get(10, 10);
    expect(temp).toBe(-2);
    

    sim.step();
    
    const frozenUnit = sim.units.find(u => u.id === actualId);
    expect(frozenUnit?.meta.frozen).toBe(true);
    expect(frozenUnit?.meta.brittle).toBe(true);
    expect(frozenUnit?.meta.stunned).toBe(true);
    expect(frozenUnit?.meta.frozenDuration).toBeGreaterThan(0);
  });

  it('should chill units in cold (but not freezing) temperatures', () => {
    const sim = new Simulator();

    

    const unit = { ...Encyclopaedia.unit('farmer'), pos: { x: 5, y: 5 } };
    const addedUnit = sim.addUnit(unit);
    const actualId = addedUnit.id;
    

    sim.temperatureField.set(5, 5, 2);
    

    sim.step();
    
    const chilledUnit = sim.units.find(u => u.id === actualId);
    

    expect(chilledUnit?.meta.chilled).toBe(true);
    expect(chilledUnit?.meta.chilledDuration).toBe(20);
    expect(chilledUnit?.meta.slowAmount).toBe(0.5);
  });

  it('should thaw frozen units when temperature rises', () => {
    const sim = new Simulator();

    

    const unit = { ...Encyclopaedia.unit('priest'), pos: { x: 8, y: 8 } };
    const addedUnit = sim.addUnit(unit);
    const actualId = addedUnit.id;
    

    sim.temperatureField.set(8, 8, -3);
    sim.step();
    
    expect(sim.units.find(u => u.id === actualId)?.meta.frozen).toBe(true);
    

    sim.temperatureField.set(8, 8, 10);
    sim.step();
    
    const thawedUnit = sim.units.find(u => u.id === actualId);
    expect(thawedUnit?.meta.frozen).toBeFalsy();
    expect(thawedUnit?.meta.brittle).toBeFalsy();
    expect(thawedUnit?.meta.stunned).toBeFalsy();
  });

  it('should make brittle (frozen) units take double damage', () => {
    const sim = new Simulator();

    

    const construct = { ...Encyclopaedia.unit('freezebot'), pos: { x: 10, y: 10 } };
    sim.addUnit(construct);
    

    sim.temperatureField.set(10, 10, -5);
    sim.step();
    
    expect(sim.units.find(u => u.id === construct.id)?.meta.frozen).toBe(true);
    

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
    

    sim.step();
    
    const damagedUnit = sim.units.find(u => u.id === construct.id);

    expect(damagedUnit?.hp).toBe(initialHp - 1);
  });

  it('should end winter storm and warm up temperatures', () => {
    const sim = new Simulator();
    

    BiomeEffects.createWinterStorm(sim);
    expect(sim.winterActive).toBe(true);
    
    const coldTemp = sim.temperatureField.get(15, 15);
    expect(coldTemp).toBeLessThan(10);
    
    BiomeEffects.endWinterStorm(sim);
    expect(sim.winterActive).toBe(false);
    
    const warmerTemp = sim.temperatureField.get(15, 15);
    expect(warmerTemp).toBeGreaterThan(coldTemp);
    expect(warmerTemp).toBeLessThanOrEqual(20); // Capped at 20
  });

  it('should prevent frozen units from moving', () => {
    const sim = new Simulator();
    const CommandHandler = require('../../src/core/command_handler').CommandHandler;

    

    const unit = { ...Encyclopaedia.unit('soldier'), pos: { x: 5, y: 5 }, intendedMove: { x: 1, y: 0 } };
    sim.addUnit(unit);
    

    sim.temperatureField.set(5, 5, -1);
    sim.step();
    
    const frozenUnit = sim.units.find(u => u.id === unit.id);
    expect(frozenUnit?.meta.frozen).toBe(true);
    expect(frozenUnit?.intendedMove).toEqual({ x: 0, y: 0 }); // Movement cleared
  });
});