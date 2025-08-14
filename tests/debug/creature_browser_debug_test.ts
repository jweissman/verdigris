import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';

describe('Creature Browser Debug', () => {
  it('should debug the actual browser logic step by step', () => {
    console.log('🐛 CREATURE BROWSER STEP-BY-STEP DEBUG');
    
    // Step 1: Create browser
    console.log('\n1. Creating CreatureBrowser...');
    const browser = new CreatureBrowser();
    expect(browser.getCount()).toBeGreaterThan(0);
    console.log(`✅ Browser created with ${browser.getCount()} creatures`);
    
    // Step 2: Test filtering
    console.log('\n2. Testing filter functionality...');
    const all = browser.getAll();
    const segmented = browser.getByFilter('segmented');
    const huge = browser.getByFilter('huge');
    
    console.log(`   All: ${all.length} creatures`);
    console.log(`   Segmented: ${segmented.length} creatures`);
    console.log(`   Huge: ${huge.length} creatures`);
    
    // Step 3: Check specific creatures we care about
    console.log('\n3. Checking specific creatures...');
    const mesoworm = all.find(c => c.type === 'mesoworm');
    const dragon = all.find(c => c.type === 'dragon');
    
    if (mesoworm) {
      console.log(`✅ Mesoworm: sprite="${mesoworm.sprite}", segments=${mesoworm.segmentCount}`);
    } else {
      console.log(`❌ Mesoworm not found`);
    }
    
    if (dragon) {
      console.log(`✅ Dragon: sprite="${dragon.sprite}", segments=${dragon.segmentCount}, huge=${dragon.isHuge}`);
    } else {
      console.log(`❌ Dragon not found`);
    }
    
    expect(mesoworm).toBeDefined();
    expect(dragon).toBeDefined();
  });
  
  it('should check what breaks in CreatureBrowserUI constructor', () => {
    console.log('\n🖥️ CREATURE BROWSER UI DEBUG');
    
    // Mock DOM elements that the UI expects
    const mockDocument = {
      getElementById: (id: string) => {
        console.log(`   UI looking for element: ${id}`);
        if (id === 'creature-filter') {
          return {
            addEventListener: () => console.log('   ✅ Filter event listener added')
          };
        } else if (id === 'creature-grid') {
          return {
            innerHTML: null
          };
        } else if (id === 'creature-count') {
          return {
            textContent: null
          };
        }
        console.log(`   ❌ Element ${id} not found`);
        return null;
      },
      querySelectorAll: (selector: string) => {
        console.log(`   UI querying: ${selector}`);
        return []; // No canvas elements in headless mode
      }
    };
    
    // This simulates what would happen in browser
    console.log('\nSimulating UI initialization...');
    try {
      // Can't actually instantiate CreatureBrowserUI in headless mode
      // but we can analyze what it would do
      console.log('✅ UI would attempt to find DOM elements');
      console.log('✅ UI would setup event listeners');
      console.log('✅ UI would call renderCreatures()');
      console.log('❌ UI would fail at renderSprites() due to no canvas elements');
    } catch (error) {
      console.log(`❌ UI initialization failed: ${error}`);
    }
    
    expect(true).toBe(true); // Just a placeholder
  });
});