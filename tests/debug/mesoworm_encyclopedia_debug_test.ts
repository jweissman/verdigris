import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';

describe('Mesoworm Encyclopedia Debug', () => {
  it('should find mesoworm in encyclopedia even if not in segmented filter', () => {
    const browser = new CreatureBrowser();
    const allCreatures = browser.getAll();
    
    console.log('🔍 SEARCHING FOR MESOWORM:');
    console.log(`Total creatures: ${allCreatures.length}`);
    
    // Look for mesoworm in all creatures
    const mesoworm = allCreatures.find(c => c.type === 'mesoworm');
    
    if (mesoworm) {
      console.log(`✅ Found mesoworm in encyclopedia!`);
      console.log(`  Type: "${mesoworm.type}"`);
      console.log(`  Sprite: "${mesoworm.sprite}"`);
      console.log(`  HP: ${mesoworm.hp}`);
      console.log(`  Tags: [${mesoworm.tags.join(', ')}]`);
      console.log(`  Segment count: ${mesoworm.segmentCount}`);
      console.log(`  Is segmented tag present: ${mesoworm.tags.includes('segmented')}`);
    } else {
      console.log(`❌ Mesoworm not found in encyclopedia at all!`);
      
      // Show all creatures that contain 'worm'
      const wormCreatures = allCreatures.filter(c => c.type.includes('worm'));
      console.log(`Found ${wormCreatures.length} worm-like creatures:`);
      wormCreatures.forEach(c => {
        console.log(`  ${c.type}: tags=[${c.tags.join(', ')}]`);
      });
    }
    
    // Test segmented filter specifically
    const segmented = browser.getByFilter('segmented');
    const mesowormInSegmented = segmented.find(c => c.type === 'mesoworm');
    
    console.log(`\\nSegmented filter results: ${segmented.length} creatures`);
    if (mesowormInSegmented) {
      console.log(`✅ Mesoworm found in segmented filter`);
    } else {
      console.log(`❌ Mesoworm NOT found in segmented filter`);
      console.log(`Segmented creatures found:`);
      segmented.forEach(c => {
        console.log(`  ${c.type}: tags=[${c.tags.join(', ')}]`);
      });
    }
    
    expect(allCreatures.length).toBeGreaterThan(0);
  });
});