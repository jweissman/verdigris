import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Scene Loading Test', () => {
  it('should verify simple mesoworm test scene loads correctly', () => {
    console.log('🎬 SCENE LOADING TEST');
    
    const sim = new Simulator(20, 15);
    const sceneLoader = new SceneLoader(sim);
    
    console.log('\n1. Available scenarios:');
    const scenarios = Object.keys(SceneLoader.scenarios);
    scenarios.forEach(scenario => {
      console.log(`   - ${scenario}`);
    });
    
    console.log(`\n2. Checking if simpleMesowormTest is available:`);
    const hasSimpleMesowormTest = scenarios.includes('simpleMesowormTest');
    console.log(`   simpleMesowormTest: ${hasSimpleMesowormTest ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (hasSimpleMesowormTest) {
      console.log('\n3. Loading simpleMesowormTest scene...');
      try {
        sceneLoader.loadScenario('simpleMesowormTest');
        console.log(`✅ Scene loaded successfully`);
        console.log(`   Units created: ${sim.units.length}`);
        
        // Check what units were created
        console.log('\n4. Units in scene:');
        sim.units.forEach(unit => {
          console.log(`   - ${unit.id}: ${unit.sprite} at (${unit.pos.x}, ${unit.pos.y})`);
        });
        
        // Look for our expected units
        const grappler = sim.units.find(u => u.sprite === 'grappler' || u.id.includes('grappler'));
        const mesoworm = sim.units.find(u => u.sprite === 'mesoworm-head' || u.id.includes('mesoworm'));
        
        console.log('\n5. Expected units check:');
        console.log(`   Grappler: ${grappler ? '✅ FOUND' : '❌ MISSING'}`);
        console.log(`   Mesoworm: ${mesoworm ? '✅ FOUND' : '❌ MISSING'}`);
        
        if (grappler) {
          console.log(`      Grappler details: ${grappler.sprite}, hp=${grappler.hp}, team=${grappler.team}`);
        }
        if (mesoworm) {
          console.log(`      Mesoworm details: ${mesoworm.sprite}, hp=${mesoworm.hp}, segments=${mesoworm.meta.segmentCount}`);
        }
        
        expect(sim.units.length).toBeGreaterThan(0);
        expect(grappler).toBeDefined();
        expect(mesoworm).toBeDefined();
        
      } catch (error) {
        console.log(`❌ Scene loading failed: ${error}`);
        throw error;
      }
    } else {
      throw new Error('simpleMesowormTest scenario not found in available scenarios');
    }
  });
  
  it('should run mesoworm scene and test segmented creation', () => {
    console.log('\n🐛 MESOWORM SEGMENTED CREATION TEST');
    
    const sim = new Simulator(20, 15);
    const sceneLoader = new SceneLoader(sim);
    
    sceneLoader.loadScenario('simpleMesowormTest');
    
    console.log(`\nInitial units: ${sim.units.length}`);
    
    // Run one step to trigger segmented creature creation
    console.log('\nRunning one simulation step to create segments...');
    sim.step();
    
    console.log(`After step: ${sim.units.length} units`);
    
    // Check for mesoworm segments
    const mesowormHead = sim.units.find(u => u.sprite === 'mesoworm-head');
    const mesowormSegments = sim.units.filter(u => u.meta.segment && u.meta.parentId === mesowormHead?.id);
    
    console.log('\nSegmented creature analysis:');
    if (mesowormHead) {
      console.log(`✅ Mesoworm head: ${mesowormHead.id}, sprite="${mesowormHead.sprite}"`);
      console.log(`   Segments: ${mesowormSegments.length}`);
      
      mesowormSegments.forEach((segment, i) => {
        console.log(`   Segment ${i+1}: ${segment.id}, sprite="${segment.sprite}", type="${segment.meta.segmentType}"`);
      });
      
      expect(mesowormSegments.length).toBe(2); // Mesoworm should have 2 segments
      expect(mesowormSegments.some(s => s.sprite === 'mesoworm-body')).toBe(true);
      expect(mesowormSegments.some(s => s.sprite === 'mesoworm-tail')).toBe(true);
    } else {
      console.log('❌ No mesoworm head found');
      expect(mesowormHead).toBeDefined();
    }
  });
});