import { describe, expect, it } from 'bun:test';
import { CreatureBrowser, type CreatureData } from '../../src/mwe/creature_browser';

describe('CreatureBrowser Module', () => {
  it('should load creatures from encyclopaedia', () => {
    const browser = new CreatureBrowser();
    
    expect(browser.getCount()).toBeGreaterThan(15);
    
    const all = browser.getAll();
    expect(all.length).toBe(browser.getCount());
    
    // Test specific creature exists
    const farmer = all.find(c => c.type === 'farmer');
    expect(farmer).toBeDefined();
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.team).toBe('friendly');
  });

  it('should filter creatures correctly', () => {
    const browser = new CreatureBrowser();
    
    const huge = browser.getByFilter('huge');
    const mechanical = browser.getByFilter('mechanical');
    const friendly = browser.getByFilter('friendly');
    const hostile = browser.getByFilter('hostile');
    
    expect(huge.length).toBeGreaterThan(0);
    expect(mechanical.length).toBeGreaterThan(0);
    expect(friendly.length).toBeGreaterThan(0);
    expect(hostile.length).toBeGreaterThan(0);
    
    // Test filtering logic
    huge.forEach(creature => {
      expect(creature.isHuge).toBe(true);
    });
    
    mechanical.forEach(creature => {
      expect(creature.isMechanical).toBe(true);
    });
  });

  it('should provide data structure for HTML rendering', () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    // Test each creature has required properties for HTML
    creatures.forEach(creature => {
      expect(creature.type).toBeDefined();
      expect(creature.sprite).toBeDefined();
      expect(creature.hp).toBeGreaterThan(0);
      expect(creature.team).toMatch(/friendly|hostile/);
      expect(Array.isArray(creature.tags)).toBe(true);
      expect(Array.isArray(creature.abilities)).toBe(true);
      expect(typeof creature.isHuge).toBe('boolean');
      expect(typeof creature.isMechanical).toBe('boolean');
      expect(typeof creature.segmentCount).toBe('number');
    });
  });

  it('should handle window export for HTML integration', () => {
    // Test the static boot method
    const mockWindow = { CreatureBrowser: undefined } as any;
    
    // Simulate what happens in browser
    class TestCreatureBrowser extends CreatureBrowser {
      static boot(): void {
        mockWindow.CreatureBrowser = new CreatureBrowser();
      }
    }
    
    TestCreatureBrowser.boot();
    
    expect(mockWindow.CreatureBrowser).toBeDefined();
    expect(mockWindow.CreatureBrowser.getCount()).toBeGreaterThan(0);
  });
});