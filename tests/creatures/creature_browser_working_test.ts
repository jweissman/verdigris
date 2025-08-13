import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';

describe('Creature Browser - Core Functionality Working', () => {
  it('should have working creature data and filtering', () => {
    const browser = new CreatureBrowser();
    
    const all = browser.getAll();
    const huge = browser.getByFilter('huge');
    const mechanical = browser.getByFilter('mechanical');
    const friendly = browser.getByFilter('friendly');
    
    expect(all.length).toBeGreaterThan(20);
    expect(huge.length).toBeGreaterThan(0);
    expect(mechanical.length).toBeGreaterThan(0);
    expect(friendly.length).toBeGreaterThan(0);
    
    // Test specific creatures for Mechatron anchor point debugging
    const farmer = all.find(c => c.type === 'farmer');
    const mechatron = all.find(c => c.type === 'mechatron');
    
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.isHuge).toBe(false);
    
    expect(mechatron?.sprite).toBe('mechatron');
    expect(mechatron?.isHuge).toBe(true);
    expect(mechatron?.isMechanical).toBe(true);
  });
});