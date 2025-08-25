import { test, expect } from 'bun:test';
import { UnitRenderer } from '../../src/rendering/unit_renderer';
import { Unit } from '../../src/types/Unit';

/**
 * Integration test: Verify views use centralized unit rendering by checking source code
 * This prevents drift in animation logic between different views
 */





  


  


  



  



  



  








  


/**
 * Test that centralized renderer gives consistent frame choices
 */
test('centralized renderer gives consistent animation frames', () => {

  const mockSim = {
    processedEvents: [],
    ticks: 0
  };
  
  const unitRenderer = new UnitRenderer(mockSim as any);
  

  const unit: Unit = {
    id: 'test-unit',
    type: 'soldier',
    sprite: 'soldier',
    hp: 50,
    maxHp: 100,
    state: 'idle',
    pos: { x: 5, y: 5 },
    intendedMove: { x: 0, y: 0 },
    team: 'friendly',
    mass: 1,
    abilities: [],
    meta: {}
  };
  

  unit.state = 'dead';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(3);
  
  unit.state = 'attack';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(2);
  
  unit.state = 'idle';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(0);
  expect(unitRenderer.getAnimationFrame(unit, 400)).toBe(0); // No cycling for idle to prevent jitter
  
});