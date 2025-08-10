import { describe, expect, it } from 'bun:test';
import Encyclopaedia from '../src/dmg/encyclopaedia';

describe('Forest Creatures', () => {
  it('should create druid unit', () => {
    const druid = Encyclopaedia.unit('druid');
    
    expect(druid).toBeDefined();
    expect(druid.sprite).toBe('druid');
    expect(druid.hp).toBe(35);
    expect(druid.maxHp).toBe(35);
    expect(druid.tags).toContain('forest');
    expect(druid.tags).toContain('magic');
    expect(druid.tags).toContain('nature');
    expect(druid.abilities?.entangle).toBeDefined();
  });

  it('should create naturist unit', () => {
    const naturist = Encyclopaedia.unit('naturist');
    
    expect(naturist).toBeDefined();
    expect(naturist.sprite).toBe('naturist');
    expect(naturist.hp).toBe(28);
    expect(naturist.maxHp).toBe(28);
    expect(naturist.tags).toContain('forest');
    expect(naturist.tags).toContain('support');
    expect(naturist.tags).toContain('nature');
    expect(naturist.abilities?.regenerate).toBeDefined();
  });

  it('should create wildmage unit', () => {
    const wildmage = Encyclopaedia.unit('wildmage');
    
    expect(wildmage).toBeDefined();
    expect(wildmage.sprite).toBe('wildmage');
    expect(wildmage.hp).toBe(25);
    expect(wildmage.maxHp).toBe(25);
    expect(wildmage.tags).toContain('forest');
    expect(wildmage.tags).toContain('magic');
    expect(wildmage.tags).toContain('chaos');
    expect(wildmage.abilities?.wildBolt).toBeDefined();
  });

  it('should have unique abilities for each forest caster', () => {
    const druid = Encyclopaedia.unit('druid');
    const naturist = Encyclopaedia.unit('naturist');
    const wildmage = Encyclopaedia.unit('wildmage');
    
    // Druid has entangle
    expect(druid.abilities?.entangle?.name).toBe('entangle');
    expect(druid.abilities?.entangle?.range).toBe(6);
    
    // Naturist has regenerate
    expect(naturist.abilities?.regenerate?.name).toBe('regenerate');
    expect(naturist.abilities?.regenerate?.range).toBe(5);
    
    // Wildmage has wild bolt
    expect(wildmage.abilities?.wildBolt?.name).toBe('wild-bolt');
    expect(wildmage.abilities?.wildBolt?.range).toBe(7);
  });
});