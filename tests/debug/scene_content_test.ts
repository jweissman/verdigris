import { describe, expect, it } from 'bun:test';
import { SceneLoader } from '../../src/core/scene_loader';

describe('Scene Content Test', () => {
  it('should check what content is actually in simpleMesowormTest', () => {
    console.log('📄 SCENE CONTENT ANALYSIS');
    
    const sceneContent = SceneLoader.scenarios.simpleMesowormTest;
    console.log('\nActual scene content:');
    console.log('---START---');
    console.log(sceneContent);
    console.log('---END---');
    
    console.log('\nScene content analysis:');
    console.log(`Length: ${sceneContent.length} characters`);
    console.log(`Lines: ${sceneContent.split('\n').length}`);
    
    // Check if it contains our expected content
    const hasGrappler = sceneContent.includes('g');
    const hasMesoworm = sceneContent.includes('m');
    const hasComment = sceneContent.includes('grappler');
    
    console.log(`Contains 'g': ${hasGrappler}`);
    console.log(`Contains 'm': ${hasMesoworm}`);
    console.log(`Contains 'grappler' comment: ${hasComment}`);
    
    expect(sceneContent).toBeDefined();
    expect(sceneContent.length).toBeGreaterThan(0);
  });
});