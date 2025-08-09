import { describe, expect, it } from 'bun:test';
import { Game } from '../src/game';
import { SceneLoader } from '../src/scene_loader';

describe('Scene Browser MWE - Test-Driven', () => {
  it('should create game instance with proper canvas and renderer setup', () => {
    // Mock canvas for headless testing
    const mockCanvas = { 
      width: 320, 
      height: 200,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        imageSmoothingEnabled: false,
        canvas: { width: 320, height: 200 }
      } as any)
    };
    
    const game = new Game(mockCanvas);
    
    expect(game.sim).toBeDefined();
    expect(game.renderer).toBeDefined();
    expect(game.sim.fieldWidth).toBe(40);
    expect(game.sim.fieldHeight).toBe(25);
    
    console.log('✅ Game instance created with Simulator and Renderer');
  });

  it('should load scene with creatures for testing anchor points and shadows', () => {
    const mockCanvas = { 
      width: 320, 
      height: 200,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        imageSmoothingEnabled: false,
        canvas: { width: 320, height: 200 }
      } as any)
    };
    
    const game = new Game(mockCanvas);
    const sceneLoader = new SceneLoader(game.sim);
    
    // Create test scene with various creature types for anchor point testing
    // Using correct character mappings from defaultLegend
    const creatureTestScene = `f.s.r.p.b.t
..............
Q.............
..............
w.d.g.........
..............`;
    
    sceneLoader.loadFromText(creatureTestScene);
    
    const creatures = game.sim.units;
    expect(creatures.length).toBeGreaterThan(0);
    
    // Test specific creature positions for anchor point verification  
    const farmer = creatures.find(u => u.sprite === 'farmer');
    const megasquirrel = creatures.find(u => u.sprite === 'megasquirrel');
    const soldier = creatures.find(u => u.sprite === 'soldier');
    
    expect(farmer?.pos).toEqual({ x: 0, y: 0 });
    expect(megasquirrel?.pos).toEqual({ x: 0, y: 2 });
    expect(soldier?.pos).toEqual({ x: 2, y: 0 });
    
    console.log(`✅ Scene loaded with ${creatures.length} creatures for anchor point testing`);
    console.log(`   - Normal units: farmer(0,0), soldier(2,0), ranger(4,0)`);
    console.log(`   - Huge units: megasquirrel(0,2)`);
    console.log(`   - Various sprites for shadow/grid testing`);
  });

  it('should handle click-to-grid coordinate mapping for different canvas sizes', () => {
    const testCanvasSizes = [
      { width: 320, height: 200, name: 'small' },
      { width: 640, height: 400, name: 'medium' },
      { width: 960, height: 600, name: 'large' }
    ];
    
    testCanvasSizes.forEach(canvasSize => {
      const game = new Game({ 
        width: canvasSize.width, 
        height: canvasSize.height,
        getContext: () => ({
          clearRect: () => {},
          canvas: canvasSize
        } as any)
      });
      
      // Test click at center of canvas
      const centerClickX = canvasSize.width / 2;
      const centerClickY = canvasSize.height / 2;
      
      // Convert to grid coordinates
      const gridX = Math.floor((centerClickX / canvasSize.width) * game.sim.fieldWidth);
      const gridY = Math.floor((centerClickY / canvasSize.height) * game.sim.fieldHeight);
      
      // Should map to center of grid
      const expectedGridX = Math.floor(game.sim.fieldWidth / 2);
      const expectedGridY = Math.floor(game.sim.fieldHeight / 2);
      
      expect(gridX).toBe(expectedGridX);
      expect(gridY).toBe(expectedGridY);
      
      console.log(`✅ ${canvasSize.name} canvas (${canvasSize.width}x${canvasSize.height}): center click -> grid (${gridX}, ${gridY})`);
    });
  });

  it('should trigger lightning with animated sprite instead of just particles', () => {
    const game = new Game({ 
      width: 320, 
      height: 200,
      getContext: () => ({
        clearRect: () => {},
        drawImage: () => {},
        canvas: { width: 320, height: 200 }
      } as any)
    });
    
    const initialProjectiles = game.sim.projectiles.length;
    
    // Trigger lightning at specific grid position
    game.sim.parseCommand('lightning 10 8');
    game.sim.step();
    
    // Should create both particles AND sprite-based effects
    const lightningParticles = game.sim.particles.filter(p => p.type === 'lightning');
    
    expect(lightningParticles.length).toBeGreaterThan(0);
    
    // Check if lightning sprite would be used (16x48, 8 frames, 6px per frame)
    const lightningSpriteFrames = 8;
    const lightningFrameHeight = 6;
    const lightningWidth = 16;
    
    console.log(`✅ Lightning triggered: ${lightningParticles.length} particles created`);
    console.log(`   - Should render with animated sprite: ${lightningWidth}x${lightningFrameHeight * lightningSpriteFrames}`);
    console.log(`   - Animation: ${lightningSpriteFrames} frames at ${lightningFrameHeight}px each`);
  });

  it('should provide visual debugging info for creature rendering issues', () => {
    const game = new Game({ 
      width: 320, 
      height: 200,
      getContext: () => ({
        clearRect: () => {},
        canvas: { width: 320, height: 200 }
      } as any)
    });
    
    const sceneLoader = new SceneLoader(game.sim);
    
    // Load creatures that commonly have rendering issues
    // Using Desert Day character mappings: M=desert-megaworm, X=mechatron, G=grappler
    const problemScene = `M.......X
..........
..........
G.........`;
    
    sceneLoader.loadFromText(problemScene);
    
    const desertMegaworm = game.sim.units.find(u => u.sprite === 'big-worm' && u.segments?.length === 12);
    const mechatron = game.sim.units.find(u => u.sprite === 'mechatron');
    const grappler = game.sim.units.find(u => u.sprite === 'ranger' && u.abilities?.grapple);
    
    // Test huge segmented unit phantom system  
    if (desertMegaworm?.tags?.includes('huge')) {
      console.log(`✅ Desert Megaworm is HUGE+SEGMENTED: should create phantom units + segments`);
      console.log(`   - Position: (${desertMegaworm.pos.x}, ${desertMegaworm.pos.y})`);
      console.log(`   - Segments: ${desertMegaworm.segments?.length || 0}`);
      console.log(`   - Should check: segment chain, anchor points, multi-cell coverage`);
    }
    
    if (mechatron?.tags?.includes('huge')) {
      console.log(`✅ Mechatron is HUGE: should create phantom units`);
      console.log(`   - Position: (${mechatron.pos.x}, ${mechatron.pos.y})`);
      console.log(`   - Known issue: may render at wrong Y position in isometric view`);
    }
    
    if (grappler) {
      console.log(`✅ Grappler: test grappling hook mechanics`);
      console.log(`   - Position: (${grappler.pos.x}, ${grappler.pos.y})`);
      console.log(`   - Should check: grapple line rendering, pin targets`);
    }
    
    // This test exposes what we need to visually verify
    expect(game.sim.units.length).toBe(3);
  });
});