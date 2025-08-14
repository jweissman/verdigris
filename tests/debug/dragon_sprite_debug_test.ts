import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Dragon Sprite Debug', () => {
  it('should test dragon head/body/tail sprite system', () => {
    const sim = new Simulator(30, 20);
    
    const dragon = { ...Encyclopaedia.unit('dragon'), id: 'dragon1', pos: { x: 15, y: 10 } };
    sim.addUnit(dragon);
    
    console.log('🐉 DRAGON SPRITE DEBUG:');
    console.log(`Head sprite: "${dragon.sprite}"`);
    console.log(`useCustomSegmentSprites: ${dragon.meta.useCustomSegmentSprites}`);
    console.log(`segmentCount: ${dragon.meta.segmentCount}`);
    
    console.log(`\nBefore step: ${sim.units.length} units`);
    
    // Create segments
    sim.step();
    
    console.log(`\nAfter step: ${sim.units.length} units`);
    
    // List all units and their exact sprites
    const head = sim.units.find(u => u.id === 'dragon1');
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'dragon1')
      .sort((a, b) => (a.meta.segmentIndex || 0) - (b.meta.segmentIndex || 0));
    const phantoms = sim.units.filter(u => u.meta.phantom && u.meta.parentId === 'dragon1');
    
    console.log(`\n📊 DRAGON SPRITE BREAKDOWN:`);
    if (head) {
      console.log(`  Head (${head.id}): sprite="${head.sprite}"`);
    }
    
    segments.forEach((segment, i) => {
      const expectedType = i === segments.length - 1 ? 'tail' : 'body';
      console.log(`  Segment ${segment.meta.segmentIndex} (${segment.id}): sprite="${segment.sprite}", type="${segment.meta.segmentType}" (expected: ${expectedType})`);
    });
    
    console.log(`  Phantoms: ${phantoms.length} units`);
    phantoms.forEach(phantom => {
      console.log(`    ${phantom.id}: sprite="${phantom.sprite}"`);
    });
    
    // Test the sprite generation logic manually
    console.log(`\n🔧 DRAGON SPRITE LOGIC TEST:`);
    const baseSprite = dragon.sprite.replace('-head', '');
    console.log(`  Base sprite extracted: "${baseSprite}"`);
    console.log(`  Expected body sprite: "${baseSprite}-body"`);
    console.log(`  Expected tail sprite: "${baseSprite}-tail"`);
    
    expect(segments.length).toBe(8);
    expect(head?.sprite).toBe('dragon-head');
    
    // Check segment sprites
    segments.forEach((segment, i) => {
      const expectedSprite = i === segments.length - 1 ? 'dragon-tail' : 'dragon-body';
      expect(segment.sprite).toBe(expectedSprite);
    });
  });
});