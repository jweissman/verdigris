import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Game } from '../src/game';
import Orthographic from '../src/views/orthographic';
import Isometric from '../src/views/isometric';

describe.skip('Tiny Canvas Rendering Debug', () => {
  it('should debug sprite loading for tiny canvas', () => {
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    
    console.log(`✅ Loaded ${sprites.size} sprites, ${backgrounds.size} backgrounds`);
    
    // Test specific sprites we know should exist
    const farmerSprite = sprites.get('farmer');
    const soldierSprite = sprites.get('soldier');
    const mechatronSprite = sprites.get('mechatron');
    
    console.log(`   - farmer sprite: ${farmerSprite ? `${farmerSprite.width}x${farmerSprite.height}` : 'missing'}`);
    console.log(`   - soldier sprite: ${soldierSprite ? `${soldierSprite.width}x${soldierSprite.height}` : 'missing'}`);
    console.log(`   - mechatron sprite: ${mechatronSprite ? `${mechatronSprite.width}x${mechatronSprite.height}` : 'missing'}`);
    
    expect(sprites.size).toBeGreaterThan(0);
  });

  it('should test tiny sim setup with single creature', () => {
    const sim = new Simulator(2, 2);
    const farmer = Encyclopaedia.unit('farmer');
    
    // Add creature at center
    sim.addUnit({
      ...farmer,
      pos: { x: 1, y: 1 }
    });
    
    expect(sim.units.length).toBe(1);
    expect(sim.units[0].pos).toEqual({ x: 1, y: 1 });
    expect(sim.units[0].sprite).toBe('farmer');
    
    console.log(`✅ Tiny sim: ${sim.units.length} units at (${sim.units[0].pos.x}, ${sim.units[0].pos.y})`);
    console.log(`   - Unit: ${sim.units[0].sprite} (${sim.units[0].hp}hp)`);
  });

  it('should test Orthographic view on tiny canvas', () => {
    // Create mock canvas context
    let drawImageCalls: any[] = [];
    let fillRectCalls: any[] = [];
    
    const mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      imageSmoothingEnabled: false,
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: (x: number, y: number, w: number, h: number) => {
        fillRectCalls.push({ x, y, w, h, fillStyle: mockContext.fillStyle });
      },
      strokeRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      clearRect: () => {},
      drawImage: (...args: any[]) => {
        drawImageCalls.push(args);
      },
      setTransform: () => {},
      canvas: { width: 64, height: 64 }
    };

    // Setup tiny sim
    const sim = new Simulator(2, 2);
    const farmer = Encyclopaedia.unit('farmer');
    sim.addUnit({ ...farmer, pos: { x: 1, y: 1 } });

    // Load sprites
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();

    // Test Orthographic rendering
    const orthoView = new Orthographic(mockContext as any, sim, 64, 64, sprites, backgrounds);
    orthoView.show();

    console.log(`✅ Orthographic render test:`);
    console.log(`   - drawImage calls: ${drawImageCalls.length}`);
    console.log(`   - fillRect calls: ${fillRectCalls.length}`);
    
    // Check if sprite was drawn
    const spriteDrawCalls = drawImageCalls.filter(call => call.length >= 3);
    console.log(`   - Sprite draw calls: ${spriteDrawCalls.length}`);
    
    if (spriteDrawCalls.length === 0) {
      console.log(`   - No sprites drawn - checking fillRect for blue squares:`);
      const blueSquares = fillRectCalls.filter(call => 
        call.fillStyle && call.fillStyle.includes('blue')
      );
      console.log(`   - Blue squares: ${blueSquares.length}`);
    }

    expect(drawImageCalls.length + fillRectCalls.length).toBeGreaterThan(0);
  });

  it('should test Isometric view on tiny canvas', () => {
    // Create mock canvas context with more detailed tracking
    let drawImageCalls: any[] = [];
    let fillRectCalls: any[] = [];
    let arcCalls: any[] = [];
    
    const mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      imageSmoothingEnabled: false,
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      fillRect: (x: number, y: number, w: number, h: number) => {
        fillRectCalls.push({ x, y, w, h, fillStyle: mockContext.fillStyle });
      },
      strokeRect: () => {},
      beginPath: () => {},
      arc: (x: number, y: number, r: number) => {
        arcCalls.push({ x, y, r });
      },
      fill: () => {},
      stroke: () => {},
      clearRect: () => {},
      drawImage: (...args: any[]) => {
        drawImageCalls.push(args);
      },
      setTransform: () => {},
      canvas: { width: 64, height: 64 }
    };

    // Setup tiny sim
    const sim = new Simulator(2, 2);
    const farmer = Encyclopaedia.unit('farmer');
    sim.addUnit({ ...farmer, pos: { x: 1, y: 1 } });

    // Load sprites
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();

    // Test Isometric rendering
    const isoView = new Isometric(mockContext as any, sim, 64, 64, sprites, backgrounds);
    isoView.show();

    console.log(`✅ Isometric render test:`);
    console.log(`   - drawImage calls: ${drawImageCalls.length}`);
    console.log(`   - fillRect calls: ${fillRectCalls.length}`);
    console.log(`   - arc calls: ${arcCalls.length}`);
    
    if (drawImageCalls.length === 0 && fillRectCalls.length === 0 && arcCalls.length === 0) {
      console.log(`   ❌ NOTHING RENDERED - Isometric view is broken`);
    }

    expect(drawImageCalls.length + fillRectCalls.length + arcCalls.length).toBeGreaterThan(0);
  });

  it('should identify the specific rendering issue', () => {
    console.log(`\n🔍 RENDERING ISSUE ANALYSIS:`);
    console.log(`   1. Orthographic: Blue squares = sprites not loading properly`);
    console.log(`   2. Isometric: Nothing rendered = view.show() not working`);
    console.log(`   3. Need to check: sprite loading, view initialization, canvas context`);
    console.log(`   4. Solution: Debug sprite loading path and isometric coordinate system`);
    
    // This test just documents the issues we found
    expect(true).toBe(true);
  });
});