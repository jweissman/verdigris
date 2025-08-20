import { describe, expect, it, beforeEach } from 'bun:test';
import { Folks } from '../../src/dmg/folks';
import { setupTest } from '../test_helper';

describe('Folks Module', () => {
  beforeEach(() => {
    setupTest();
    Folks.resetCache();
  });

  it('should load folk units from folks.json', () => {
    const folks = Folks.all;
    
    expect(folks.size).toBe(26); // We have 26 folks now
    expect(folks.has('farmer')).toBe(true);
    expect(folks.has('soldier')).toBe(true);
    expect(folks.has('priest')).toBe(true);
    expect(folks.has('ranger')).toBe(true);
    expect(folks.has('bombardier')).toBe(true);
    expect(folks.has('builder')).toBe(true);
    expect(folks.has('mechanic')).toBe(true);
    expect(folks.has('skirmisher')).toBe(true);
    expect(folks.has('rainmaker')).toBe(true);
    expect(folks.has('naturist')).toBe(true);
    expect(folks.has('wildmage')).toBe(true);
    expect(folks.has('miner')).toBe(true);
    expect(folks.has('mindmender')).toBe(true);
    expect(folks.has('fueler')).toBe(true);
  });

  it('should get specific folk unit', () => {
    const farmer = Folks.get('farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.hp).toBe(25);
    expect(farmer?.team).toBe('friendly');
  });

  it('should get list of folk names', () => {
    const names = Folks.names;
    expect(names).toContain('farmer');
    expect(names).toContain('soldier');
    expect(names).toContain('priest');
  });

  it('should load core folk archetypes', () => {
    const folks = Folks.all;
    

    expect(folks.size).toBeGreaterThan(0);
    

    expect(folks.has('farmer')).toBe(true);
    expect(folks.has('soldier')).toBe(true);
    expect(folks.has('priest')).toBe(true);
    expect(folks.has('ranger')).toBe(true);
    expect(folks.has('bombardier')).toBe(true);
  });

  it('should NOT include hostile units', () => {
    const folks = Folks.all;
    

    expect(folks.has('worm')).toBe(false);
    expect(folks.has('big-worm')).toBe(false);
    expect(folks.has('desert-megaworm')).toBe(false);
    expect(folks.has('demon')).toBe(false);
  });

  it('should NOT include mechanical constructs', () => {
    const folks = Folks.all;
    

    expect(folks.has('freezebot')).toBe(false);
    expect(folks.has('clanker')).toBe(false);
    expect(folks.has('spiker')).toBe(false);
    expect(folks.has('roller')).toBe(false);
    expect(folks.has('zapper')).toBe(false);
  });

  it('should have valid structure for all folks', () => {
    const folks = Folks.all;
    
    for (const [, unit] of folks.entries()) {

      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.maxHp).toBeGreaterThan(0);
      expect(unit.mass).toBeGreaterThan(0);
      expect(unit.team).toBe('friendly');
      expect(unit.sprite).toBeDefined();
      expect(unit.state).toBe('idle');
      

      if (unit.tags) {
        expect(Array.isArray(unit.tags)).toBe(true);
      }
    }
  });

  it('should ensure all folks are friendly', () => {
    const folks = Folks.all;
    
    for (const [, unit] of folks.entries()) {
      expect(unit.team).toBe('friendly');
    }
  });

  it('should identify folk types correctly', () => {
    expect(Folks.include('farmer')).toBe(true);
    expect(Folks.include('soldier')).toBe(true);
    expect(Folks.include('worm')).toBe(false);
    expect(Folks.include('freezebot')).toBe(false);
  });

  it('should get specific folk unit', () => {
    const farmer = Folks.get('farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.hp).toBe(25);
    expect(farmer?.team).toBe('friendly');
  });

  it('should get list of folk names', () => {
    const names = Folks.names;
    expect(names).toContain('farmer');
    expect(names).toContain('soldier');
    expect(names).not.toContain('worm');
  });

  it('should have reasonable stats for folk units', () => {
    const folks = Folks.all;
    
    for (const [, unit] of folks.entries()) {

      expect(unit.hp).toBeGreaterThan(0);
      expect(unit.hp).toBeLessThanOrEqual(100); // Rainmaker has 80 HP
      

      expect(unit.mass).toBeGreaterThan(0);
      expect(unit.mass).toBeLessThanOrEqual(2); // Folk are human-sized
    }
  });
});