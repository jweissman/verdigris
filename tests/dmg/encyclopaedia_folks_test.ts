import { describe, expect, it } from 'bun:test';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Folks } from '../../src/dmg/folks';

describe('Encyclopaedia with Folks', () => {
  it('should include all folks in bestiary', () => {
    const folkNames = Folks.names;
    
    for (const folkName of folkNames) {
      expect(Encyclopaedia.bestiary[folkName]).toBeDefined();
    }
  });

  it('should be able to create folk units', () => {
    const farmer = Encyclopaedia.unit('farmer');
    expect(farmer).toBeDefined();
    expect(farmer.hp).toBe(25);
    expect(farmer.team).toBe('friendly');
    
    const soldier = Encyclopaedia.unit('soldier');
    expect(soldier).toBeDefined();
    expect(soldier.hp).toBe(30);
  });

  it('should still have hostile units from units.json', () => {
    // Check that hostile units are still in bestiary
    expect(Encyclopaedia.bestiary['worm']).toBeDefined();
    expect(Encyclopaedia.bestiary['demon']).toBeDefined();
  });

  it('should still have mechanical constructs from units.json', () => {
    // Check that constructs are still available
    expect(Encyclopaedia.bestiary['freezebot']).toBeDefined();
    expect(Encyclopaedia.bestiary['clanker']).toBeDefined();
  });

  it('should not have duplicates', () => {
    // Get all keys and check for uniqueness
    const allKeys = Object.keys(Encyclopaedia.bestiary);
    const uniqueKeys = new Set(allKeys);
    
    expect(allKeys.length).toBe(uniqueKeys.size);
  });
});