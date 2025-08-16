import { describe, expect, it } from "bun:test";
import { CreatureBrowser, type CreatureData } from "../../src/mwe/creature_browser";

describe("CreatureBrowser", () => {
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
    

    const farmer = all.find(c => c.type === 'farmer');
    const mechatron = all.find(c => c.type === 'mechatron');
    
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.isHuge).toBe(false);
    
    expect(mechatron?.sprite).toBe('mechatron');
    expect(mechatron?.isHuge).toBe(true);
    expect(mechatron?.isMechanical).toBe(true);
  });

  it("should load all creature types", () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    expect(creatures.length).toBeGreaterThan(20);
    expect(creatures.some(c => c.type === 'farmer')).toBe(true);
    expect(creatures.some(c => c.type === 'big-worm')).toBe(true);
    expect(creatures.some(c => c.type === 'mechatron')).toBe(true);
  });

  it("should filter huge creatures", () => {
    const browser = new CreatureBrowser();
    const hugeCreatures = browser.getByFilter('huge');
    
    expect(hugeCreatures.length).toBeGreaterThan(0);
    expect(hugeCreatures.every(c => c.isHuge)).toBe(true);
  });

  it("should filter mechanical creatures", () => {
    const browser = new CreatureBrowser();
    const mechanicalCreatures = browser.getByFilter('mechanical');
    
    expect(mechanicalCreatures.length).toBeGreaterThan(0);
    expect(mechanicalCreatures.every(c => c.isMechanical)).toBe(true);
  });

  it("should filter by team", () => {
    const browser = new CreatureBrowser();
    const friendlyCreatures = browser.getByFilter('friendly');
    const hostileCreatures = browser.getByFilter('hostile');
    
    expect(friendlyCreatures.length).toBeGreaterThan(0);
    expect(friendlyCreatures.every(c => c.team === 'friendly')).toBe(true);
    
    expect(hostileCreatures.length).toBeGreaterThan(0);
    expect(hostileCreatures.every(c => c.team === 'hostile')).toBe(true);
  });

  it("should identify segmented creatures", () => {
    const browser = new CreatureBrowser();
    const segmentedCreatures = browser.getByFilter('segmented');
    
    expect(segmentedCreatures.length).toBeGreaterThan(0);
    expect(segmentedCreatures.some(c => c.type === 'big-worm')).toBe(true);
  });

  it("should include abilities for each creature", () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    const priest = creatures.find(c => c.type === 'priest');
    expect(priest).toBeDefined();
    expect(priest?.abilities).toContain('heal');
    expect(priest?.abilities).toContain('radiant');
    
    const mechatron = creatures.find(c => c.type === 'mechatron');
    expect(mechatron).toBeDefined();
    expect(mechatron?.abilities.length).toBeGreaterThan(0);
  });

  it("should have correct count method", () => {
    const browser = new CreatureBrowser();
    const count = browser.getCount();
    const allCreatures = browser.getAll();
    
    expect(count).toBe(allCreatures.length);
  });

  it('should provide data structure for HTML rendering', () => {
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    creatures.forEach((creature: CreatureData) => {
      expect(creature.type).toBeDefined();
      expect(creature.sprite).toBeDefined();
      expect(creature.hp).toBeGreaterThan(0);
      expect(creature.team).toMatch(/friendly|hostile|neutral/);
      expect(Array.isArray(creature.tags)).toBe(true);
      expect(Array.isArray(creature.abilities)).toBe(true);
      expect(typeof creature.isHuge).toBe('boolean');
      expect(typeof creature.isMechanical).toBe('boolean');
      expect(typeof creature.segmentCount).toBe('number');
    });
  });

  it('should load creatures from encyclopaedia', () => {
    const browser = new CreatureBrowser();
    
    expect(browser.getCount()).toBeGreaterThan(15);
    
    const all = browser.getAll();
    expect(all.length).toBe(browser.getCount());
    

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
    

    creatures.forEach(creature => {
      expect(creature.type).toBeDefined();
      expect(creature.sprite).toBeDefined();
      expect(creature.hp).toBeGreaterThan(0);
      expect(creature.team).toMatch(/friendly|hostile|neutral/);
      expect(Array.isArray(creature.tags)).toBe(true);
      expect(Array.isArray(creature.abilities)).toBe(true);
      expect(typeof creature.isHuge).toBe('boolean');
      expect(typeof creature.isMechanical).toBe('boolean');
      expect(typeof creature.segmentCount).toBe('number');
    });
  });

  it('should handle window export for HTML integration', () => {

    const mockWindow = { CreatureBrowser: undefined } as any;
    

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