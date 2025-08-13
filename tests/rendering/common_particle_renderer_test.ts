import { describe, expect, it, beforeEach } from 'bun:test';
import { ParticleRenderer } from '../../src/rendering/particle_renderer';

describe('Common Particle Renderer', () => {
  let mockCtx: any;
  let mockSprites: Map<string, HTMLImageElement>;
  let renderer: ParticleRenderer;

  beforeEach(() => {
    // Create mock canvas context
    mockCtx = {
      save: () => {},
      restore: () => {},
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      drawImage: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {}
      })
    };

    // Create mock sprites map
    mockSprites = new Map();
    
    // Mock leaf sprite
    const mockLeafSprite = {} as HTMLImageElement;
    mockSprites.set('leaf', mockLeafSprite);
    
    // Mock lightning sprite  
    const mockLightningSprite = {} as HTMLImageElement;
    mockSprites.set('lightning', mockLightningSprite);

    renderer = new ParticleRenderer(mockSprites);
  });

  it('should render leaf particles with sprite animation', () => {
    const leafParticle = {
      type: 'leaf',
      pos: { x: 100, y: 50 },
      lifetime: 25, // Frame 2 (25/10 = 2.5, floor = 2)
      color: '#228B22'
    };

    const config = { x: 160, y: 120, alpha: 0.8, scale: 1.5 };

    // Spy on drawImage to verify sprite rendering
    let drawImageCalled = false;
    mockCtx.drawImage = () => { drawImageCalled = true; };

    renderer.renderParticle(mockCtx, leafParticle, config);

    expect(drawImageCalled).toBe(true);
  });

  it('should render rain particles as streaks', () => {
    const rainParticle = {
      type: 'rain',
      pos: { x: 80, y: 60 },
      vel: { x: 2, y: 5 },
      color: '#4169E1'
    };

    const config = { x: 160, y: 120, alpha: 0.6 };

    // Spy on stroke to verify line rendering
    let strokeCalled = false;
    mockCtx.stroke = () => { strokeCalled = true; };

    renderer.renderParticle(mockCtx, rainParticle, config);

    expect(strokeCalled).toBe(true);
  });

  it('should render snow particles with sparkle effect', () => {
    const snowParticle = {
      type: 'snow',
      pos: { x: 120, y: 80 },
      radius: 3,
      color: '#FFFFFF'
    };

    const config = { x: 160, y: 120, alpha: 0.9, scale: 1.2 };

    // Spy on fill and stroke to verify circle and sparkle
    let fillCalled = false;
    let strokeCalled = false;
    mockCtx.fill = () => { fillCalled = true; };
    mockCtx.stroke = () => { strokeCalled = true; };

    renderer.renderParticle(mockCtx, snowParticle, config);

    expect(fillCalled).toBe(true);
    expect(strokeCalled).toBe(true); // Sparkle effect for radius > 1
  });

  it('should render fire particles with gradient', () => {
    const fireParticle = {
      type: 'debris',
      pos: { x: 90, y: 70 },
      radius: 4,
      color: '#FF0000'
    };

    const config = { x: 160, y: 120, alpha: 0.7 };

    // Spy on gradient creation
    let gradientCreated = false;
    mockCtx.createRadialGradient = () => {
      gradientCreated = true;
      return { addColorStop: () => {} };
    };

    renderer.renderParticle(mockCtx, fireParticle, config);

    expect(gradientCreated).toBe(true);
  });

  it('should render lightning particles with sprite animation', () => {
    const lightningParticle = {
      type: 'lightning',
      pos: { x: 200, y: 100 },
      lifetime: 9, // Frame 3 (9/3 = 3, frame 3 % 4 = 3)
      color: '#FFFFFF'
    };

    const config = { x: 160, y: 120, alpha: 1.0, scale: 2.0 };

    // Spy on drawImage to verify sprite rendering
    let drawImageCalled = false;
    mockCtx.drawImage = () => { drawImageCalled = true; };

    renderer.renderParticle(mockCtx, lightningParticle, config);

    expect(drawImageCalled).toBe(true);
  });

  it('should render generic particles as circles for unknown types', () => {
    const genericParticle = {
      type: 'unknown_type',
      pos: { x: 50, y: 30 },
      radius: 2,
      color: '#FFFF00'
    };

    const config = { x: 160, y: 120, alpha: 0.5 };

    // Spy on arc and fill for circle rendering
    let arcCalled = false;
    let fillCalled = false;
    mockCtx.arc = () => { arcCalled = true; };
    mockCtx.fill = () => { fillCalled = true; };

    renderer.renderParticle(mockCtx, genericParticle, config);

    expect(arcCalled).toBe(true);
    expect(fillCalled).toBe(true);
  });

  it('should handle missing sprites gracefully with fallbacks', () => {
    const emptySprites = new Map<string, HTMLImageElement>();
    const fallbackRenderer = new ParticleRenderer(emptySprites);

    const leafParticle = {
      type: 'leaf',
      pos: { x: 100, y: 50 },
      lifetime: 15,
      color: '#228B22'
    };

    const config = { x: 160, y: 120, alpha: 0.8 };

    // Spy on ellipse for fallback leaf rendering
    let ellipseCalled = false;
    mockCtx.ellipse = () => { ellipseCalled = true; };

    fallbackRenderer.renderParticle(mockCtx, leafParticle, config);

    expect(ellipseCalled).toBe(true);
  });
});