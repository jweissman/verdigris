import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { Game } from '../../src/core/game';
import Isometric from '../../src/views/isometric';

describe.skip('Real Isometric Renderer Debug', () => {
  it('should debug real isometric rendering with detailed logging', () => {
    
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


    // Load sprites (same as creature browser)
    const sprites = Game.loadSprites();
    const backgrounds = Game.loadBackgrounds();
    
    
    const farmerSprite = sprites.get(farmer.sprite);

    // Create real isometric view (64x64 canvas - small canvas debugging will trigger)
    const isoView = new Isometric(mockContext as any, sim, 64, 64, sprites, backgrounds);
    
    isoView.show();
    
    const drawOps = operations.filter(op => ['fillRect', 'arc', 'ellipse', 'drawImage'].includes(op.type));
    
    // Check for sprite drawing specifically
    const spriteDraws = operations.filter(op => op.type === 'drawImage');
    const fallbackSquares = operations.filter(op => op.type === 'fillRect' && 
      (op.fillStyle === 'blue' || op.fillStyle === 'green'));
    
    
    if (spriteDraws.length > 0) {
      spriteDraws.forEach((draw, i) => {
      });
    } else if (fallbackSquares.length > 0) {
      fallbackSquares.forEach(square => {
      });
    } else {
    }

    expect(operations.length).toBeGreaterThan(0);
  });
});