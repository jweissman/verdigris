import { describe, expect, it } from 'bun:test';
import { Simulator } from '../src/simulator';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import Isometric from '../src/views/isometric';

describe.skip('Isometric Rendering Debug - Coordinate Analysis', () => {
  it('should debug coordinate calculations for 64x64 canvas', () => {
    // Track all rendering operations with coordinates
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
      fill: () => operations.push({ type: 'fill', fillStyle: mockContext.fillStyle }),
      stroke: () => operations.push({ type: 'stroke' }),
      drawImage: (...args: any[]) => {
        operations.push({ type: 'drawImage', args });
      },
      setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => 
        operations.push({ type: 'setTransform', a, b, c, d, e, f })
    };

    // Setup tiny sim with farmer at center
    const sim = new Simulator(2, 2);
    const farmer = Encyclopaedia.unit('farmer');
    sim.addUnit({ ...farmer, pos: { x: 1, y: 1 } });

    console.log(`🔍 SETUP ANALYSIS:`);
    console.log(`   - Canvas: 64x64 pixels`);
    console.log(`   - Sim field: 2x2 cells`); 
    console.log(`   - Unit position: (1, 1) - center of 2x2 grid`);
    console.log(`   - Expected: sprite should render at center of 64x64 canvas`);

    // Create isometric view
    const sprites = new Map(); // Empty sprites for now
    const backgrounds = new Map();
    const isoView = new Isometric(mockContext as any, sim, 64, 64, sprites, backgrounds);
    
    // Render and analyze
    isoView.show();
    
    console.log(`\n📊 RENDERING OPERATIONS (${operations.length} total):`);
    
    // Analyze coordinate patterns
    const drawOps = operations.filter(op => ['fillRect', 'arc', 'drawImage'].includes(op.type));
    const transforms = operations.filter(op => ['translate', 'scale', 'setTransform'].includes(op.type));
    
    console.log(`   - Draw operations: ${drawOps.length}`);
    console.log(`   - Transform operations: ${transforms.length}`);
    
    // Check if anything renders within canvas bounds
    const inBounds = drawOps.filter(op => {
      if (op.type === 'arc') {
        return op.x >= 0 && op.x <= 64 && op.y >= 0 && op.y <= 64;
      } else if (op.type === 'fillRect') {
        return op.x >= -64 && op.x <= 128 && op.y >= -64 && op.y <= 128; // Allow some overflow
      }
      return true;
    });
    
    console.log(`   - Operations in canvas bounds: ${inBounds.length}`);
    
    // Show actual coordinates
    drawOps.forEach((op, i) => {
      if (i < 10) { // Limit output
        console.log(`   - ${op.type}: x=${op.x}, y=${op.y} ${op.r ? `r=${op.r}` : ''}`);
      }
    });
    
    if (drawOps.length === 0) {
      console.log(`   ❌ NO DRAW OPERATIONS - Isometric view not rendering anything`);
    }
    
    expect(operations.length).toBeGreaterThan(0);
  });

  it('should test different canvas sizes to find optimal size', () => {
    const testSizes = [
      { width: 32, height: 32, name: 'tiny' },
      { width: 64, height: 64, name: 'small' }, 
      { width: 128, height: 128, name: 'medium' },
      { width: 256, height: 256, name: 'large' }
    ];
    
    testSizes.forEach(size => {
      let drawOps: any[] = [];
      
      const mockContext = {
        canvas: { width: size.width, height: size.height },
        fillStyle: '', strokeStyle: '', lineWidth: 0, globalAlpha: 1,
        save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
        clearRect: () => {}, beginPath: () => {}, stroke: () => {}, setTransform: () => {},
        fillRect: (x: number, y: number, w: number, h: number) => 
          drawOps.push({ type: 'fillRect', x, y, w, h }),
        arc: (x: number, y: number, r: number) => 
          drawOps.push({ type: 'arc', x, y, r }),
        fill: () => {},
        drawImage: (...args: any[]) => 
          drawOps.push({ type: 'drawImage', args }),
        imageSmoothingEnabled: false
      };

      const sim = new Simulator(2, 2);
      const farmer = Encyclopaedia.unit('farmer');
      sim.addUnit({ ...farmer, pos: { x: 1, y: 1 } });

      const sprites = new Map();
      const backgrounds = new Map();
      const isoView = new Isometric(mockContext as any, sim, size.width, size.height, sprites, backgrounds);
      isoView.show();

      const inBounds = drawOps.filter(op => {
        if (op.type === 'arc') {
          return op.x >= 0 && op.x <= size.width && op.y >= 0 && op.y <= size.height;
        } else if (op.type === 'fillRect') {
          return op.x < size.width + 50 && op.y < size.height + 50; // Allow some overflow
        }
        return true;
      });

      console.log(`📐 ${size.name} (${size.width}x${size.height}): ${drawOps.length} ops, ${inBounds.length} in bounds`);
    });
  });

  it('should analyze isometric coordinate transformation', () => {
    console.log(`\n🔄 ISOMETRIC COORDINATE ANALYSIS:`);
    
    // Test the toIsometric transformation manually
    // This is what Isometric view should be doing:
    const toIsometric = (x: number, y: number) => {
      return {
        x: (x - y) * 16,  // Assuming some scale factor
        y: (x + y) * 8   // Assuming some scale factor  
      };
    };

    const gridPositions = [
      { gridX: 0, gridY: 0 }, 
      { gridX: 1, gridY: 0 },
      { gridX: 0, gridY: 1 },
      { gridX: 1, gridY: 1 }  // Our farmer position
    ];

    gridPositions.forEach(pos => {
      const iso = toIsometric(pos.gridX, pos.gridY);
      console.log(`   Grid (${pos.gridX}, ${pos.gridY}) -> Iso (${iso.x}, ${iso.y})`);
    });

    console.log(`\n💡 HYPOTHESIS:`);
    console.log(`   - If farmer at (1,1) maps to coordinates outside 64x64 canvas`);
    console.log(`   - Then isometric view renders but outside visible area`);
    console.log(`   - Solution: Adjust canvas size or coordinate scaling`);
    
    expect(true).toBe(true);
  });
});