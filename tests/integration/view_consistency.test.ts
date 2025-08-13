import { test, expect } from 'bun:test';
import { UnitRenderer } from '../../src/rendering/unit_renderer';

/**
 * Integration test: Verify views use centralized unit rendering by checking source code
 * This prevents drift in animation logic between different views
 */
test('views use centralized unit renderer - source verification', () => {
  // Read source files and verify they use UnitRenderer
  const fs = require('fs');
  const path = require('path');
  
  const cinematicPath = path.join(__dirname, '../../src/views/cinematic.ts');
  const orthographicPath = path.join(__dirname, '../../src/views/orthographic.ts');
  
  const cinematicSource = fs.readFileSync(cinematicPath, 'utf8');
  const orthographicSource = fs.readFileSync(orthographicPath, 'utf8');
  
  // Both should import UnitRenderer
  expect(cinematicSource).toMatch(/import.*UnitRenderer.*from.*unit_renderer/);
  expect(orthographicSource).toMatch(/import.*UnitRenderer.*from.*unit_renderer/);
  
  // Both should have unitRenderer property
  expect(cinematicSource).toMatch(/private unitRenderer: UnitRenderer/);
  expect(orthographicSource).toMatch(/private unitRenderer: UnitRenderer/);
  
  // Both should initialize unitRenderer in constructor
  expect(cinematicSource).toMatch(/this\.unitRenderer = new UnitRenderer/);
  expect(orthographicSource).toMatch(/this\.unitRenderer = new UnitRenderer/);
  
  // Cinematic should use centralized methods instead of custom logic
  expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldRenderUnit/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldBlinkFromDamage/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.getRenderPosition/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.getSpriteDimensions/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.getAnimationFrame/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.shouldFlipSprite/);
  expect(cinematicSource).toMatch(/this\.unitRenderer\.getUnitColor/);
  
});

/**
 * Test that centralized renderer gives consistent frame choices
 */
test('centralized renderer gives consistent animation frames', () => {
  // Create minimal mock sim
  const mockSim = {
    processedEvents: [],
    ticks: 0
  };
  
  const unitRenderer = new UnitRenderer(mockSim as any);
  
  // Test unit with different states
  const unit = {
    id: 'test-unit',
    sprite: 'soldier',
    hp: 50,
    maxHp: 100,
    state: 'idle' as const,
    pos: { x: 5, y: 5 },
    meta: {}
  };
  
  // Test different unit states
  unit.state = 'dead';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(3);
  
  unit.state = 'attack';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(2);
  
  unit.state = 'idle';
  expect(unitRenderer.getAnimationFrame(unit, 0)).toBe(0);
  expect(unitRenderer.getAnimationFrame(unit, 400)).toBe(1);
  
});