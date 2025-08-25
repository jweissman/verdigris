import { describe, test, expect } from 'bun:test';
import Renderer from '../../src/core/renderer';

describe('Hover Cell', () => {
  test('renderer can store hover cell', () => {
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
      }) as any,
    } as any;
    
    const mockSim = {
      units: [],
      projectiles: [],
      particles: [],
      fieldWidth: 40,
      fieldHeight: 25,
    } as any;
    
    const renderer = new Renderer(320, 200, mockCanvas, mockSim, new Map());
    
    // Test that we can set hover cell
    renderer.hoverCell = { x: 10, y: 10 };
    expect(renderer.hoverCell).toBeDefined();
    expect(renderer.hoverCell?.x).toBe(10);
    expect(renderer.hoverCell?.y).toBe(10);
  });
});