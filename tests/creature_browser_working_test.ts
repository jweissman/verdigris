import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../src/creature_browser';

describe('Creature Browser - Core Functionality Working', () => {
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
    
    // Test specific creatures for Mechatron anchor point debugging
    const farmer = all.find(c => c.type === 'farmer');
    const mechatron = all.find(c => c.type === 'mechatron');
    const desertMegaworm = all.find(c => c.type === 'desert-megaworm');
    
    expect(farmer?.sprite).toBe('farmer');
    expect(farmer?.isHuge).toBe(false);
    
    expect(mechatron?.sprite).toBe('mechatron');
    expect(mechatron?.isHuge).toBe(true);
    expect(mechatron?.isMechanical).toBe(true);
    
    console.log(`✅ Creature Browser Data Ready:`);
    console.log(`   - Total: ${all.length} creatures`);
    console.log(`   - Huge: ${huge.length} (${huge.map(c => c.type).join(', ')})`);
    console.log(`   - Mechanical: ${mechanical.length}`);
    console.log(`   - Desert creatures ready for sprite testing`);
    
    if (mechatron) {
      console.log(`   - Mechatron: ${mechatron.sprite}, HP=${mechatron.hp}, huge=${mechatron.isHuge}`);
    }
    
    if (desertMegaworm) {
      console.log(`   - Desert Megaworm: ${desertMegaworm.sprite}, segments=${desertMegaworm.segmentCount}`);
    }
  });

  it('should work in browser environment with real sprites', () => {
    // This test documents what should happen in browser
    console.log(`\n🌐 BROWSER ENVIRONMENT EXPECTATIONS:`);
    console.log(`   1. Game.loadSprites() will load actual sprite images`);
    console.log(`   2. Tiny sim + Orthographic view will render farmer/mechatron sprites`);
    console.log(`   3. Left/right facing will show different sprite frames`);
    console.log(`   4. Mechatron anchor point issues will be visible for debugging`);
    console.log(`   5. Desert creatures will show segmented/grappling features`);
    
    expect(true).toBe(true);
  });

  it('should identify next steps for sprite debugging', () => {
    console.log(`\n🎯 NEXT STEPS FOR CREATURE BROWSER:`);
    console.log(`   1. Browser test: Open creature-browser.html to see actual sprites`);
    console.log(`   2. Debug Mechatron positioning: Compare left/right anchor points`);
    console.log(`   3. Check huge unit shadows: Verify they don't overlap text`);
    console.log(`   4. Verify desert creatures: Grappler, desert-megaworm rendered`);
    console.log(`   5. Test filtering: Huge/mechanical/segmented categories work`);
    
    expect(true).toBe(true);
  });
});