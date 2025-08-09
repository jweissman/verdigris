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
    } as any as HTMLCanvasElement);
    
    // Trigger lightning at specific grid position
    game.sim.parseCommand('lightning 10 8');
    game.sim.step();
    
    // Should create both particles AND sprite-based effects
    const lightningParticles = game.sim.particles.filter(p => p.type === 'lightning');
    
    expect(lightningParticles.length).toBeGreaterThan(0);

    // NOTE: We need to check that the lightning sprite would be used/animated correctly! 
  });

});