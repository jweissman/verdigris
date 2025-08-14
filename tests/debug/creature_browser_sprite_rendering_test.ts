import { describe, expect, it } from 'bun:test';
import { Game } from '../../src/core/game';

describe('Creature Browser Sprite Rendering Analysis', () => {
  it('should check if sprite files exist for segmented creatures', () => {
    console.log('🎨 SPRITE FILE EXISTENCE CHECK');
    
    // Load sprites like the creature browser does
    const sprites = Game.loadSprites();
    
    console.log(`\nLoaded ${sprites.size} sprites total`);
    
    // Check if we're in headless mode
    if (typeof Image === 'undefined') {
      console.log('🚫 Running in headless mode - sprite loading disabled');
      expect(sprites.size).toBe(0);
      return;
    }
    
    // Check segmented creature sprites
    const segmentedCreatureSprites = [
      'mesoworm-head', 'mesoworm-body', 'mesoworm-tail',
      'dragon-head', 'dragon-body', 'dragon-tail',
      'big-worm', // check if big-worm exists
      'worm', // check if worm exists
      'mimic-worm' // check if mimic-worm exists
    ];
    
    console.log('\nSegmented creature sprite availability:');
    segmentedCreatureSprites.forEach(spriteName => {
      const exists = sprites.has(spriteName);
      console.log(`  ${spriteName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    // List all sprites to see what's actually available
    console.log('\nAll available sprites:');
    const allSprites = Array.from(sprites.keys()).sort();
    allSprites.forEach(sprite => {
      if (sprite.includes('worm') || sprite.includes('dragon')) {
        console.log(`  ${sprite}`);
      }
    });
    
    // Check for segmented creatures specifically
    console.log('\nSprites matching segmented creature patterns:');
    ['mesoworm', 'dragon', 'worm'].forEach(base => {
      const headExists = sprites.has(`${base}-head`);
      const bodyExists = sprites.has(`${base}-body`);
      const tailExists = sprites.has(`${base}-tail`);
      console.log(`  ${base}: head=${headExists ? '✅' : '❌'} body=${bodyExists ? '✅' : '❌'} tail=${tailExists ? '✅' : '❌'}`);
    });
    
    expect(sprites.size).toBeGreaterThan(0);
  });
  
  it('should test sprite rendering simulation setup', () => {
    console.log('\n🎮 SPRITE RENDERING SIMULATION TEST');
    
    // This simulates what the creature browser does
    const sprites = Game.loadSprites();
    const bgs = Game.loadBackgrounds();
    
    console.log(`Sprites loaded: ${sprites.size}`);
    console.log(`Backgrounds loaded: ${bgs.size}`);
    
    // Check if we're in headless mode
    if (typeof Image === 'undefined') {
      console.log('🚫 Running in headless mode - sprite/background loading disabled');
      expect(sprites.size).toBe(0);
      expect(bgs.size).toBe(0);
      return;
    }
    
    // Test if we can create a mock canvas context
    console.log('\nTesting mock rendering setup...');
    
    // Check if the required sprites exist for rendering
    const requiredSprites = ['mesoworm-head', 'dragon-head', 'soldier'];
    const missing = requiredSprites.filter(sprite => !sprites.has(sprite));
    
    if (missing.length > 0) {
      console.log(`❌ Missing required sprites: ${missing.join(', ')}`);
    } else {
      console.log(`✅ All required sprites found`);
    }
    
    expect(sprites.size).toBeGreaterThan(0);
    expect(bgs.size).toBeGreaterThan(0);
  });
});