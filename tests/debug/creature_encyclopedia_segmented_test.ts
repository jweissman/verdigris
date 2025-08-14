import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';

describe('Creature Encyclopedia Segmented Test', () => {
  it('should list all segmented creatures and their rendering data', () => {
    const browser = new CreatureBrowser();
    const segmented = browser.getByFilter('segmented');
    
    console.log('🐛 SEGMENTED CREATURES IN ENCYCLOPEDIA:');
    console.log(`Found ${segmented.length} segmented creatures:`);
    
    segmented.forEach(creature => {
      console.log(`\\n  ${creature.type}:`);
      console.log(`    Sprite: "${creature.sprite}"`);
      console.log(`    HP: ${creature.hp}`);
      console.log(`    Mass: ${creature.mass}`);
      console.log(`    Segments: ${creature.segmentCount}`);
      console.log(`    Team: ${creature.team}`);
      console.log(`    Tags: [${creature.tags.join(', ')}]`);
      console.log(`    Abilities: [${creature.abilities.join(', ')}]`);
      console.log(`    Huge: ${creature.isHuge}`);
    });
    
    // Test specific creatures
    const mesoworm = segmented.find(c => c.type === 'mesoworm');
    const bigWorm = segmented.find(c => c.type === 'big-worm');
    const dragon = segmented.find(c => c.type === 'dragon');
    
    console.log('\\n🔍 SPECIFIC CREATURE CHECKS:');
    
    if (mesoworm) {
      console.log(`Mesoworm: sprite="${mesoworm.sprite}", segments=${mesoworm.segmentCount}, huge=${mesoworm.isHuge}`);
      expect(mesoworm.sprite).toBe('mesoworm-head');
      expect(mesoworm.segmentCount).toBe(2);
    } else {
      console.log('❌ Mesoworm not found in segmented creatures!');
    }
    
    if (bigWorm) {
      console.log(`Big-worm: sprite="${bigWorm.sprite}", segments=${bigWorm.segmentCount}, huge=${bigWorm.isHuge}`);
      expect(bigWorm.segmentCount).toBe(5);
    } else {
      console.log('❌ Big-worm not found in segmented creatures!');
    }
    
    if (dragon) {
      console.log(`Dragon: sprite="${dragon.sprite}", segments=${dragon.segmentCount}, huge=${dragon.isHuge}`);
      expect(dragon.segmentCount).toBe(8);
    } else {
      console.log('❌ Dragon not found in segmented creatures!');
    }
    
    expect(segmented.length).toBeGreaterThan(0);
  });
  
  it('should test if mesoworm can render properly with custom sprites', () => {
    const browser = new CreatureBrowser();
    const mesoworm = browser.getAll().find(c => c.type === 'mesoworm');
    
    console.log('\\n🎨 MESOWORM RENDERING TEST:');
    if (mesoworm) {
      console.log(`Mesoworm sprite: "${mesoworm.sprite}"`);
      console.log(`Expected sprites:`);
      console.log(`  Head: "mesoworm-head"`);
      console.log(`  Body: "mesoworm-body"`);  
      console.log(`  Tail: "mesoworm-tail"`);
      
      // The encyclopedia should show the head sprite
      expect(mesoworm.sprite).toBe('mesoworm-head');
      console.log('✅ Mesoworm encyclopedia rendering looks correct');
    } else {
      console.log('❌ Mesoworm not found in encyclopedia!');
      expect(mesoworm).toBeDefined();
    }
  });
});