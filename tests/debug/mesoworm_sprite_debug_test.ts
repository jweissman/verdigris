import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Mesoworm Sprite Debug', () => {
  it('should show exactly which sprites are used for mesoworm segments', () => {
    const sim = new Simulator(20, 15);
    
    const mesoworm = { ...Encyclopaedia.unit('mesoworm'), id: 'meso1', pos: { x: 10, y: 8 } };
    sim.addUnit(mesoworm);
    
    console.log('🐛 MESOWORM SPRITE DEBUG:');
    console.log(`Head sprite: "${mesoworm.sprite}"`);
    console.log(`useCustomSegmentSprites: ${mesoworm.meta.useCustomSegmentSprites}`);
    console.log(`segmentCount: ${mesoworm.meta.segmentCount}`);
    
    console.log(`\nBefore step: ${sim.units.length} units`);
    sim.units.forEach(u => {
      console.log(`  ${u.id}: sprite="${u.sprite}"`);
    });
    
    // Create segments
    sim.step();
    
    console.log(`\nAfter step: ${sim.units.length} units`);
    
    // List all units and their exact sprites
    const head = sim.units.find(u => u.id === 'meso1');
    const segments = sim.units.filter(u => u.meta.segment && u.meta.parentId === 'meso1')
      .sort((a, b) => (a.meta.segmentIndex || 0) - (b.meta.segmentIndex || 0));
    
    console.log(`\n📊 SPRITE BREAKDOWN:`);
    if (head) {
      console.log(`  Head (${head.id}): sprite="${head.sprite}"`);
    }
    
    segments.forEach((segment, i) => {
      console.log(`  Segment ${segment.meta.segmentIndex} (${segment.id}): sprite="${segment.sprite}", type="${segment.meta.segmentType}"`);
    });
    
    // Test the sprite generation logic manually
    console.log(`\n🔧 SPRITE LOGIC TEST:`);
    const baseSprite = mesoworm.sprite.replace('-head', '');
    console.log(`  Base sprite extracted: "${baseSprite}"`);
    console.log(`  Expected body sprite: "${baseSprite}-body"`);
    console.log(`  Expected tail sprite: "${baseSprite}-tail"`);
    
    expect(segments.length).toBe(2);
    expect(head?.sprite).toBe('mesoworm-head');
    expect(segments[0].sprite).toBe('mesoworm-body');
    expect(segments[1].sprite).toBe('mesoworm-tail');
  });
});