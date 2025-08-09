import { describe, expect, it } from 'bun:test';
import { CreatureBrowser as CreatureBrowserMWE } from '../src/creature_browser';

describe.skip('CreatureBrowserMWE Module', () => {
  it('should load creatures and sprites correctly', () => {
    const mwe = new CreatureBrowserMWE();
    
    // Test that creatures are loaded
    expect(mwe['creatures']).toBeDefined();
    expect(mwe['creatures'].length).toBeGreaterThan(15);
    
    // Test that sprites are loaded
    expect(mwe['sprites']).toBeDefined();
    expect(mwe['sprites'].size).toBeGreaterThan(0);
  });

  it('should render creature sprites to canvas without errors', () => {
    const mwe = new CreatureBrowserMWE();
    
    // Create mock canvas
    const mockCanvas = {
      width: 64,
      height: 64,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        drawImage: () => {},
        imageSmoothingEnabled: false,
        fillStyle: '',
        font: '',
        textAlign: ''
      })
    } as any;

    // Test rendering different creatures
    const testCreatures = ['farmer', 'soldier', 'mechatron'];
    
    testCreatures.forEach(creatureType => {
      try {
        mwe.renderCreatureSprite(mockCanvas, creatureType, 'left');
        mwe.renderCreatureSprite(mockCanvas, creatureType, 'right');
        console.log(`✅ ${creatureType}: rendered left/right sprites`);
      } catch (error) {
        console.error(`❌ ${creatureType}: render failed:`, error);
        throw error;
      }
    });
  });

  it('should handle missing sprites gracefully', () => {
    const mwe = new CreatureBrowserMWE();
    
    const mockCanvas = {
      width: 64,
      height: 64,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        fillText: () => {},
        drawImage: () => {},
        imageSmoothingEnabled: false,
        fillStyle: '',
        font: '',
        textAlign: ''
      })
    } as any;

    // Test with non-existent creature - should not crash
    expect(() => {
      mwe.renderCreatureSprite(mockCanvas, 'nonexistent-creature', 'left');
    }).not.toThrow();
    
    console.log('✅ Gracefully handles missing sprites');
  });

  it('should provide the correct interface for HTML integration', () => {
    // Test that the static boot method exists
    expect(typeof CreatureBrowserMWE.boot).toBe('function');
    
    // Test that boot method can be called (though it needs DOM)
    expect(() => {
      // In headless test, this will just not find DOM elements
      CreatureBrowserMWE.boot();
    }).not.toThrow();
    
    console.log('✅ CreatureBrowserMWE.boot() interface ready for HTML');
  });
});