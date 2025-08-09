import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Game } from '../src/game';
import Isometric from '../src/views/isometric';

describe.skip('Real Isometric Renderer Debug', () => {
  it('should debug real isometric rendering with detailed logging', () => {
    console.log(`🔍 REAL ISOMETRIC DEBUG TEST:`);
    
    // Create mock canvas context to capture operations
    let operations: any[] = [];
    
    const mockContext = {
      canvas: { width: 64, height: 64 },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      imageSmoothingEnabled: false,
      save: () => operations.push({ type: 'save' }),
      restore: () => operations.push({ type: 'restore' }),
      translate: (x: number, y: number) => operations.push({ type: 'translate', x, y }),
      scale: (x: number, y: number) => operations.push({ type: 'scale', x, y }),
      clearRect: (x: number, y: number, w: number, h: number) => 
        operations.push({ type: 'clearRect', x, y, w, h }),
      fillRect: (x: number, y: number, w: number, h: number) => 
        operations.push({ type: 'fillRect', x, y, w, h, fillStyle: mockContext.fillStyle }),
      strokeRect: (x: number, y: number, w: number, h: number) => 
        operations.push({ type: 'strokeRect', x, y, w, h }),
      beginPath: () => operations.push({ type: 'beginPath' }),
      arc: (x: number, y: number, r: number, start?: number, end?: number) => 
        operations.push({ type: 'arc', x, y, r, start, end }),
      ellipse: (x: number, y: number, rx: number, ry: number, rotation: number, startAngle: number, endAngle: number) =>
        operations.push({ type: 'ellipse', x, y, rx, ry }),
      fill: () => operations.push({ type: 'fill', fillStyle: mockContext.fillStyle }),
      stroke: () => operations.push({ type: 'stroke' }),
      drawImage: (...args: any[]) => {
        operations.push({ type: 'drawImage', args });
      },
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => 
        operations.push({ type: 'setTransform', a, b, c, d, e, f })
    };

    // Setup tiny sim with farmer at center (same as creature browser)
    const sim = new Simulator(2, 2);
    const farmer = Encyclopaedia.unit('farmer');
    sim.addUnit({ ...farmer, pos: { x: 1, y: 1 } });

    console.log(`   📋 Farmer unit: sprite="${farmer.sprite}", hp=${farmer.hp}`);

    // Load sprites (same as creature browser)
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    
    console.log(`   📦 Loaded ${sprites.size} sprites, ${backgrounds.size} backgrounds`);
    
    const farmerSprite = sprites.get(farmer.sprite);
    console.log(`   🖼️  Farmer sprite: ${farmerSprite ? `${farmerSprite.width}x${farmerSprite.height}` : 'NOT FOUND'}`);

    // Create real isometric view (64x64 canvas - small canvas debugging will trigger)
    const isoView = new Isometric(mockContext as any, sim, 64, 64, sprites, backgrounds);
    
    console.log(`\\n   🎬 Calling real Isometric.show()...`);
    isoView.show();
    
    console.log(`\\n   📊 RENDERING OPERATIONS SUMMARY:`);
    const drawOps = operations.filter(op => ['fillRect', 'arc', 'ellipse', 'drawImage'].includes(op.type));
    console.log(`   - Total operations: ${operations.length}`);
    console.log(`   - Draw operations: ${drawOps.length}`);
    
    // Check for sprite drawing specifically
    const spriteDraws = operations.filter(op => op.type === 'drawImage');
    const fallbackSquares = operations.filter(op => op.type === 'fillRect' && 
      (op.fillStyle === 'blue' || op.fillStyle === 'green'));
    
    console.log(`   - Sprite draws: ${spriteDraws.length}`);
    console.log(`   - Fallback squares: ${fallbackSquares.length}`);
    
    if (spriteDraws.length > 0) {
      console.log(`   ✅ Sprites were drawn!`);
      spriteDraws.forEach((draw, i) => {
        console.log(`     - Draw ${i}: args=[${draw.args.slice(0, 4).join(', ')}...] (source x,y,w,h)`);
        console.log(`       dest=[${draw.args.slice(4, 8).join(', ')}] (dest x,y,w,h)`);
      });
    } else if (fallbackSquares.length > 0) {
      console.log(`   ⚠️  No sprites - fallback squares drawn`);
      fallbackSquares.forEach(square => {
        console.log(`     - Square at (${square.x}, ${square.y}) color=${square.fillStyle}`);
      });
    } else {
      console.log(`   ❌ No drawing operations at all - something is broken`);
    }

    expect(operations.length).toBeGreaterThan(0);
  });
});