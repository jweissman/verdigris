import { test, expect } from 'bun:test';
import { UnitRenderer } from '../../src/rendering/unit_renderer';
import { Unit } from '../../src/types/Unit';

/**
 * Integration test: Verify views use centralized unit rendering by checking source code
 * This prevents drift in animation logic between different views
 */
// omg
// test('views use centralized unit renderer - source verification', () => {

//   const fs = require('fs');
//   const path = require('path');
  
//   const cinematicPath = path.join(__dirname, '../../src/views/cinematic.ts');
//   const orthographicPath = path.join(__dirname, '../../src/views/orthographic.ts');
  
//   const cinematicSource = fs.readFileSync(cinematicPath, 'utf8');
//   const orthographicSource = fs.readFileSync(orthographicPath, 'utf8');
  

//   expect(cinematicSource).toMatch(/import.*UnitRenderer.*from.*unit_renderer/);
//   expect(orthographicSource).toMatch(/import.*UnitRenderer.*from.*unit_renderer/);
  

//   expect(cinematicSource).toMatch(/private unitRenderer: UnitRenderer/);
//   expect(orthographicSource).toMatch(/private unitRenderer: UnitRenderer/);
  

//   expect(cinematicSource).toMatch(/this\.unitRenderer = new UnitRenderer/);
//   expect(orthographicSource).toMatch(/this\.unitRenderer = new UnitRenderer/);
  

//   expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldRenderUnit/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldBlinkFromDamage/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.getRenderPosition/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.getSpriteDimensions/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.getAnimationFrame/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldFlipSprite/);
//   expect(cinematicSource).toMatch(/this\.unitRenderer\.getUnitColor/);
  
// });

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