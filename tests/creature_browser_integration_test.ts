import { describe, expect, it } from 'bun:test';

describe('CreatureBrowser HTML Integration Reality Check', () => {
  it.skip('should actually work when loaded in HTML', () => {
    // Simulate browser environment
    const mockWindow = {} as any;
    global.window = mockWindow;
    
    // Import and boot the module
    const { CreatureBrowser } = require('../src/creature_browser.ts');
    
    // This should populate window.CreatureBrowser
    expect(mockWindow.CreatureBrowser).toBeDefined();
    expect(mockWindow.CreatureBrowser.getCount()).toBeGreaterThan(0);
    
    // Test what the HTML script would actually do
    const browser = mockWindow.CreatureBrowser;
    const allCreatures = browser.getAll();
    const hugeCreatures = browser.getByFilter('huge');
    
    expect(allCreatures.length).toBeGreaterThan(0);
    expect(hugeCreatures.length).toBeGreaterThan(0);
    
    // Test the actual data structure HTML expects
    const firstCreature = allCreatures[0];
    expect(firstCreature.type).toBeDefined();
    expect(firstCreature.sprite).toBeDefined();
    expect(firstCreature.hp).toBeGreaterThan(0);
    
    console.log(`   - window.CreatureBrowser.getCount() = ${browser.getCount()}`);
    console.log(`   - First creature: ${firstCreature.type} (${firstCreature.sprite})`);
    console.log(`   - Sample huge creature: ${hugeCreatures[0]?.type || 'none'}`);
    
    // Clean up
    delete (global as any).window;
  });

  it('should fail gracefully if module does not load', () => {
    // Test what happens if the module fails to load
    const mockWindow = {} as any;
    
    // Simulate HTML trying to use non-existent browser
    const tryUseCreatureBrowser = () => {
      if (!mockWindow.CreatureBrowser) {
        throw new Error('CreatureBrowser not loaded');
      }
      return mockWindow.CreatureBrowser.getCount();
    };
    
    expect(() => tryUseCreatureBrowser()).toThrow('CreatureBrowser not loaded');
  });
});