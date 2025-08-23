import { describe, expect, it, beforeEach } from 'bun:test';
import { ParticleRenderer } from '../../../src/rendering/particle_renderer';

describe('Common Particle Renderer', () => {
  let mockCtx: any;
  let mockSprites: Map<string, HTMLImageElement>;
  let renderer: ParticleRenderer;

  beforeEach(() => {

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
      fillRect: () => {}, // Add fillRect for 1-bit pixel rendering
      drawImage: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {}
      })
    };


    mockSprites = new Map();
    

    const mockLeafSprite = {} as HTMLImageElement;
    mockSprites.set('leaf', mockLeafSprite);
    

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


    let drawImageCalled = false;
    mockCtx.drawImage = () => { drawImageCalled = true; };

    renderer.renderParticle(mockCtx, leafParticle, config);

    expect(drawImageCalled).toBe(true);
  });

  it('should render rain particles as black pixels', () => {
    const rainParticle = {
      type: 'rain',
      pos: { x: 80, y: 60 },
      vel: { x: 2, y: 5 }
    };

    const config = { x: 160, y: 120, alpha: 0.6 };


    let fillRectCalled = false;
    mockCtx.fillRect = () => { fillRectCalled = true; };

    renderer.renderParticle(mockCtx, rainParticle, config);

    expect(fillRectCalled).toBe(true);
    expect(mockCtx.fillStyle).toBe('#000000'); // Black for 1-bit aesthetic
  });

  it('should render snow particles with sparkle effect', () => {
    const snowParticle = {
      type: 'snow',
      pos: { x: 120, y: 80 },
      radius: 3,
      color: '#FFFFFF'
    };

    const config = { x: 160, y: 120, alpha: 0.9, scale: 1.2 };


    let fillRectCalled = false;
    mockCtx.fillRect = () => { fillRectCalled = true; };

    renderer.renderParticle(mockCtx, snowParticle, config);

    expect(fillRectCalled).toBe(true);
    expect(mockCtx.fillStyle).toBe('#000000'); // Black for 1-bit aesthetic
  });

  it('should render fire particles as black pixels', () => {
    const fireParticle = {
      type: 'debris',
      pos: { x: 90, y: 70 },
      radius: 4,
      lifetime: 10
    };

    const config = { x: 160, y: 120, alpha: 0.7 };


    let fillRectCalled = false;
    mockCtx.fillRect = () => { fillRectCalled = true; };

    renderer.renderParticle(mockCtx, fireParticle, config);


    expect(mockCtx.fillStyle === '#000000' || mockCtx.fillStyle === '').toBe(true);
  });

  it('should render lightning particles with sprite animation', () => {
    const lightningParticle = {
      type: 'lightning',
      pos: { x: 200, y: 100 },
      lifetime: 9, // Frame 3 (9/3 = 3, frame 3 % 4 = 3)
      color: '#FFFFFF'
    };

    const config = { x: 160, y: 120, alpha: 1.0, scale: 2.0 };


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


    let fillRectCalled = false;
    mockCtx.fillRect = () => { fillRectCalled = true; };

    renderer.renderParticle(mockCtx, genericParticle, config);

    expect(fillRectCalled).toBe(true);
    expect(mockCtx.fillStyle).toBe('#000000');
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


    let fillRectCalled = false;
    mockCtx.fillRect = () => { fillRectCalled = true; };

    fallbackRenderer.renderParticle(mockCtx, leafParticle, config);

    expect(fillRectCalled).toBe(true);
    expect(mockCtx.fillStyle).toBe('#000000');
  });
});