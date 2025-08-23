import { describe, test, expect } from 'bun:test';

// Simulate the toIsometric function
function toIsometric(x: number, y: number): { x: number; y: number } {
  const tileWidth = 16;
  const rowOffset = 8; // Pixels to offset each row for pseudo-isometric depth
  const offsets = { x: -20, y: 125 }; // Simplified offsets
  const verticalSpacing = 3;
  
  const screenX = offsets.x + x * tileWidth + (y % 2) * rowOffset;
  const screenY = offsets.y + y * verticalSpacing;
  return { x: screenX, y: screenY };
}

describe('Isometric Projection Issue', () => {
  test('Y movement causes X visual drift due to hex projection', () => {
    const logicalX = 10; // Hero stays at logical X=10
    
    console.log('Hero at logical X=10, moving through Y positions:');
    
    const positions = [10, 9, 8, 7, 6, 5, 4]; // Hero Y movement with odd/even mix
    const visualPositions = positions.map(y => {
      const visual = toIsometric(logicalX, y);
      console.log(`  Y=${y} -> visual X=${visual.x}, visual Y=${visual.y} (row ${y % 2 === 0 ? 'even' : 'odd'})`);
      return visual;
    });
    
    // Show the X drift
    const minX = Math.min(...visualPositions.map(p => p.x));
    const maxX = Math.max(...visualPositions.map(p => p.x));
    const drift = maxX - minX;
    
    console.log(`\nVisual X drift: ${drift} pixels (${minX} to ${maxX})`);
    console.log('This is why the hero appears to move sideways when moving vertically!');
    
    expect(drift).toBeGreaterThan(0); // There will be drift due to hex projection
  });
});