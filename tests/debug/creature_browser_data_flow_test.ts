import { describe, expect, it } from 'bun:test';
import { CreatureBrowser } from '../../src/mwe/creature_browser';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Creature Browser Data Flow Analysis', () => {
  it('should trace the complete data flow from encyclopedia to browser', () => {
    console.log('🔍 CREATURE BROWSER DATA FLOW ANALYSIS');
    
    // Step 1: Check Encyclopedia directly
    console.log('\n1. ENCYCLOPEDIA DIRECT ACCESS:');
    try {
      const mesoworm = Encyclopaedia.unit('mesoworm');
      console.log(`✅ Mesoworm from encyclopedia: ${mesoworm.sprite}, segments=${mesoworm.meta.segmentCount}`);
    } catch (error) {
      console.log(`❌ Encyclopedia error: ${error}`);
    }
    
    // Step 2: CreatureBrowser instantiation
    console.log('\n2. CREATURE BROWSER INSTANTIATION:');
    let browser: CreatureBrowser;
    try {
      browser = new CreatureBrowser();
      console.log(`✅ Browser created successfully`);
      console.log(`   Total creatures loaded: ${browser.getCount()}`);
    } catch (error) {
      console.log(`❌ Browser creation failed: ${error}`);
      return;
    }
    
    // Step 3: Check if mesoworm loads in browser
    console.log('\n3. MESOWORM IN BROWSER:');
    const allCreatures = browser.getAll();
    const mesowormInBrowser = allCreatures.find(c => c.type === 'mesoworm');
    
    if (mesowormInBrowser) {
      console.log(`✅ Mesoworm found in browser:`);
      console.log(`   Type: ${mesowormInBrowser.type}`);
      console.log(`   Sprite: ${mesowormInBrowser.sprite}`);
      console.log(`   Segments: ${mesowormInBrowser.segmentCount}`);
      console.log(`   Tags: [${mesowormInBrowser.tags.join(', ')}]`);
    } else {
      console.log(`❌ Mesoworm NOT found in browser`);
      console.log(`   Available creatures: ${allCreatures.map(c => c.type).slice(0, 10).join(', ')}...`);
    }
    
    // Step 4: Test filtering
    console.log('\n4. SEGMENTED FILTER TEST:');
    const segmentedCreatures = browser.getByFilter('segmented');
    console.log(`   Segmented filter returned: ${segmentedCreatures.length} creatures`);
    
    const mesowormInSegmented = segmentedCreatures.find(c => c.type === 'mesoworm');
    if (mesowormInSegmented) {
      console.log(`✅ Mesoworm appears in segmented filter`);
    } else {
      console.log(`❌ Mesoworm missing from segmented filter`);
      console.log(`   Segmented creatures: ${segmentedCreatures.map(c => c.type).join(', ')}`);
    }
    
    // Step 5: Check sprite rendering data
    console.log('\n5. SPRITE RENDERING DATA:');
    if (mesowormInBrowser) {
      console.log(`   Base sprite: "${mesowormInBrowser.sprite}"`);
      console.log(`   Expected segments:`);
      console.log(`     Head: mesoworm-head (matches: ${mesowormInBrowser.sprite === 'mesoworm-head'})`);
      console.log(`     Body: mesoworm-body`);
      console.log(`     Tail: mesoworm-tail`);
      console.log(`   Segment count: ${mesowormInBrowser.segmentCount}`);
      console.log(`   Custom sprites flag: ${mesowormInBrowser.segmentCount > 0 ? 'implied' : 'none'}`);
    }
    
    // Step 6: Compare with simulation data
    console.log('\n6. SIMULATION VS BROWSER DATA:');
    try {
      const simMesoworm = Encyclopaedia.unit('mesoworm');
      const browserMesoworm = mesowormInBrowser;
      
      if (browserMesoworm) {
        console.log(`   HP: sim=${simMesoworm.hp} vs browser=${browserMesoworm.hp} ✓`);
        console.log(`   Sprite: sim="${simMesoworm.sprite}" vs browser="${browserMesoworm.sprite}" ${simMesoworm.sprite === browserMesoworm.sprite ? '✓' : '❌'}`);
        console.log(`   Segments: sim=${simMesoworm.meta.segmentCount} vs browser=${browserMesoworm.segmentCount} ${simMesoworm.meta.segmentCount === browserMesoworm.segmentCount ? '✓' : '❌'}`);
        console.log(`   Team: sim="${simMesoworm.team}" vs browser="${browserMesoworm.team}" ${simMesoworm.team === browserMesoworm.team ? '✓' : '❌'}`);
      }
    } catch (error) {
      console.log(`❌ Simulation comparison failed: ${error}`);
    }
    
    // Step 7: Test dragon data flow
    console.log('\n7. DRAGON DATA FLOW:');
    const dragon = allCreatures.find(c => c.type === 'dragon');
    if (dragon) {
      console.log(`✅ Dragon found:`);
      console.log(`   Sprite: ${dragon.sprite} (should be dragon-head)`);
      console.log(`   Segments: ${dragon.segmentCount} (should be 8)`);
      console.log(`   Huge: ${dragon.isHuge} (should be true)`);
    } else {
      console.log(`❌ Dragon not found in browser`);
    }
    
    console.log('\n📊 DATA FLOW SUMMARY:');
    console.log(`   Encyclopedia access: ${Encyclopaedia.unit('mesoworm') ? 'Working' : 'Broken'}`);
    console.log(`   Browser instantiation: ${browser ? 'Working' : 'Broken'}`);
    console.log(`   Mesoworm in browser: ${mesowormInBrowser ? 'Working' : 'Broken'}`);
    console.log(`   Segmented filtering: ${mesowormInSegmented ? 'Working' : 'Broken'}`);
    
    expect(browser.getCount()).toBeGreaterThan(0);
    expect(mesowormInBrowser).toBeDefined();
  });
  
  it('should analyze rendering preparation data', () => {
    console.log('\n🎨 RENDERING PREPARATION ANALYSIS');
    
    const browser = new CreatureBrowser();
    const creatures = browser.getAll();
    
    // Check creatures that should have custom sprites
    const segmentedCreatures = creatures.filter(c => c.segmentCount > 0);
    
    console.log(`\nSegmented creatures for rendering:`);
    segmentedCreatures.forEach(creature => {
      console.log(`  ${creature.type}:`);
      console.log(`    Sprite: "${creature.sprite}"`);
      console.log(`    Segments: ${creature.segmentCount}`);
      console.log(`    Expected sprites:`);
      
      if (creature.type === 'mesoworm') {
        console.log(`      Head: mesoworm-head ✓`);
        console.log(`      Body: mesoworm-body`);
        console.log(`      Tail: mesoworm-tail`);
      } else if (creature.type === 'dragon') {
        console.log(`      Head: dragon-head ✓`);
        console.log(`      Body: dragon-body`);
        console.log(`      Tail: dragon-tail`);
      } else {
        const base = creature.sprite.replace('-head', '');
        console.log(`      Head: ${base}-head`);
        console.log(`      Body: ${base}-body`);
        console.log(`      Tail: ${base}-tail`);
      }
    });
    
    expect(segmentedCreatures.length).toBeGreaterThan(0);
  });
});