import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';

describe('New Backgrounds', () => {
  test('new backgrounds can be set via commands', () => {
    const sim = new Simulator(32, 32);
    
    // Verify initial background is winter
    expect(sim.sceneBackground).toBe('winter');
    
    // Test setting harmonium background via sceneMetadata command
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'harmonium'
      }
    });
    
    // Process the command
    sim.tick();
    
    // Check that the background was changed
    expect(sim.sceneBackground).toBe('harmonium');
  });
  
  test('multiple new backgrounds can be cycled', () => {
    const sim = new Simulator(32, 32);
    const backgrounds = ['harmonium', 'waterfall', 'crystal-cave', 'swamp', 'volcanic'];
    
    for (const bg of backgrounds) {
      sim.queuedCommands.push({
        type: 'sceneMetadata',
        params: {
          type: 'background',
          value: bg
        }
      });
      
      sim.tick();
      
      expect(sim.sceneBackground).toBe(bg);
    }
  });
  
  test('background changes work with scene transitions', () => {
    const sim = new Simulator(32, 32);
    
    // Set initial background
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'harmonium'
      }
    });
    
    sim.tick();
    expect(sim.sceneBackground).toBe('harmonium');
    
    // Add some units for a magic scene
    sim.addUnit({
      id: 'mage1',
      type: 'mage',
      pos: { x: 10, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'friendly',
      sprite: 'mage',
      tags: ['magic', 'caster']
    });
    
    sim.addUnit({
      id: 'mage2',
      type: 'mage',
      pos: { x: 20, y: 10 },
      hp: 50,
      maxHp: 50,
      team: 'hostile',
      sprite: 'mage',
      tags: ['magic', 'caster']
    });
    
    // Change to crystal cave for magic battle
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'crystal-cave'
      }
    });
    
    sim.tick();
    expect(sim.sceneBackground).toBe('crystal-cave');
    
    // Verify units still exist after background change
    expect(sim.units.length).toBe(2);
  });
  
  test('new backgrounds work with weather effects', () => {
    const sim = new Simulator(32, 32);
    
    // Set swamp background
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'swamp'
      }
    });
    
    sim.tick();
    expect(sim.sceneBackground).toBe('swamp');
    
    // Add rain weather effect
    sim.queuedCommands.push({
      type: 'weather',
      params: {
        weatherType: 'rain',
        duration: 100
      }
    });
    
    sim.tick();
    
    // Background should remain the same
    expect(sim.sceneBackground).toBe('swamp');
    // Weather should be applied
    expect(sim.weather.current).toBe('rain');
  });
  
  test('volcanic background with fire effects', () => {
    const sim = new Simulator(32, 32);
    
    // Set volcanic background
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'volcanic'
      }
    });
    
    sim.tick();
    expect(sim.sceneBackground).toBe('volcanic');
    
    // Add fire effects that match the volcanic theme
    sim.queuedCommands.push({
      type: 'fire',
      params: {
        x: 15,
        y: 15,
        radius: 3,
        temperature: 800
      }
    });
    
    sim.tick();
    
    // Effects should be processed
    sim.tick();
    sim.tick();
    
    // Background should still be volcanic
    expect(sim.sceneBackground).toBe('volcanic');
  });
  
  test('waterfall background with water/freeze effects', () => {
    const sim = new Simulator(32, 32);
    
    // Set waterfall background
    sim.queuedCommands.push({
      type: 'sceneMetadata',
      params: {
        type: 'background',
        value: 'waterfall'
      }
    });
    
    sim.tick();
    expect(sim.sceneBackground).toBe('waterfall');
    
    // Add freeze effects near the waterfall
    sim.queuedCommands.push({
      type: 'temperature',
      params: {
        x: 10,
        y: 20,
        radius: 4,
        amount: -80
      }
    });
    
    sim.tick();
    
    // Effects should be processed
    sim.tick();
    sim.tick();
    
    // Background should still be waterfall
    expect(sim.sceneBackground).toBe('waterfall');
  });
});