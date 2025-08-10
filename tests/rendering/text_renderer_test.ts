import { describe, expect, it, beforeEach } from 'bun:test';
import { TextRenderer } from '../../src/rendering/text_renderer';

// Mock canvas context for testing
class MockCanvasContext {
  public savedStates: any[] = [];
  public operations: string[] = [];
  
  save() { 
    this.savedStates.push({});
    this.operations.push('save');
  }
  
  restore() { 
    this.savedStates.pop();
    this.operations.push('restore');
  }
  
  fillText(text: string, x: number, y: number) {
    this.operations.push(`fillText:${text}:${x}:${y}`);
  }
  
  strokeText(text: string, x: number, y: number) {
    this.operations.push(`strokeText:${text}:${x}:${y}`);
  }
  
  drawImage(...args: any[]) {
    this.operations.push(`drawImage:${args.length}`);
  }
  
  beginPath() {
    this.operations.push('beginPath');
  }
  
  closePath() {
    this.operations.push('closePath');
  }
  
  moveTo(x: number, y: number) {
    this.operations.push(`moveTo:${x}:${y}`);
  }
  
  lineTo(x: number, y: number) {
    this.operations.push(`lineTo:${x}:${y}`);
  }
  
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
    this.operations.push(`quadraticCurveTo`);
  }
  
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    this.operations.push(`arc:${x}:${y}:${radius}`);
  }
  
  fill() {
    this.operations.push('fill');
  }
  
  stroke() {
    this.operations.push('stroke');
  }
  
  // Properties
  font: string = '';
  fillStyle: string | CanvasGradient | CanvasPattern = '';
  strokeStyle: string | CanvasGradient | CanvasPattern = '';
  lineWidth: number = 1;
  filter: string = '';
  globalCompositeOperation: string = 'source-over';
}

describe('TextRenderer', () => {
  let renderer: TextRenderer;
  let mockCtx: MockCanvasContext;
  
  beforeEach(() => {
    renderer = new TextRenderer();
    mockCtx = new MockCanvasContext();
    renderer.setContext(mockCtx as any);
  });
  
  describe('initialization', () => {
    it('should initialize with default font atlases', () => {
      const newRenderer = new TextRenderer();
      expect(newRenderer.fontsReady).toBe(false);
    });
    
    it('should accept a canvas context', () => {
      const newRenderer = new TextRenderer();
      newRenderer.setContext(mockCtx as any);
      // Should not throw
      newRenderer.drawText('test', 0, 0);
      expect(mockCtx.operations.length).toBeGreaterThan(0);
    });
  });
  
  describe('text rendering', () => {
    it('should use fallback text when no atlas is loaded', () => {
      renderer.drawText('HELLO', 10, 20);
      
      expect(mockCtx.operations).toContain('save');
      expect(mockCtx.operations).toContain('fillText:HELLO:10:20');
      expect(mockCtx.operations).toContain('restore');
    });
    
    it('should apply text styles', () => {
      renderer.drawText('TEST', 0, 0, 'tiny', {
        color: '#FF0000',
        scale: 2,
        outline: true,
        outlineColor: '#000000'
      });
      
      // Check that outline was drawn
      const strokeOps = mockCtx.operations.filter(op => op.startsWith('strokeText'));
      expect(strokeOps.length).toBeGreaterThan(0);
    });
    
    it('should handle different font types', () => {
      renderer.drawText('TINY', 0, 0, 'tiny');
      expect(mockCtx.font).toContain('8px');
      
      mockCtx.operations = [];
      renderer.drawText('LARGE', 0, 0, 'large');
      expect(mockCtx.font).toContain('16px');
    });
  });
  
  describe('bubble rendering', () => {
    it('should draw speech bubbles', () => {
      renderer.drawBubble('HELLO', 100, 100, { type: 'speech' });
      
      // Should draw rounded rect and tail
      expect(mockCtx.operations).toContain('beginPath');
      expect(mockCtx.operations).toContain('fill');
      expect(mockCtx.operations).toContain('stroke');
      expect(mockCtx.operations).toContain('closePath');
    });
    
    it('should draw thought bubbles', () => {
      renderer.drawBubble('THINKING', 100, 100, { type: 'thought' });
      
      // Should draw bubbles (arc operations)
      const arcOps = mockCtx.operations.filter(op => op.startsWith('arc'));
      expect(arcOps.length).toBeGreaterThan(0);
    });
    
    it('should apply bubble options', () => {
      renderer.drawBubble('TEST', 50, 50, {
        type: 'speech',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        borderColor: '#00FF00',
        padding: 16
      });
      
      // Should have drawn operations
      expect(mockCtx.operations).toContain('fill');
      expect(mockCtx.operations).toContain('stroke');
    });
  });
  
  describe('damage numbers', () => {
    it('should draw damage numbers', () => {
      renderer.drawDamageNumber(42, 50, 100);
      
      // Should draw "-42"
      const fillTextOps = mockCtx.operations.filter(op => op.includes('fillText:-42'));
      expect(fillTextOps.length).toBeGreaterThan(0);
    });
    
    it('should apply float offset', () => {
      renderer.drawDamageNumber(10, 50, 100, 20);
      
      // Y position should be adjusted by float offset
      const fillTextOps = mockCtx.operations.filter(op => op.includes('fillText:-10'));
      expect(fillTextOps[0]).toContain(':80'); // 100 - 20
    });
    
    it('should handle critical damage differently', () => {
      mockCtx.operations = [];
      renderer.drawDamageNumber(100, 50, 100, 0, true);
      
      // Critical should use large font
      expect(mockCtx.font).toContain('24px'); // 16 * 1.5
    });
  });
  
  describe('text measurement', () => {
    it('should measure text width', () => {
      const width = renderer.measureText('HELLO', 'tiny', 1);
      expect(width).toBe(20); // 5 chars * 4 pixels
      
      const largeWidth = renderer.measureText('HI', 'large', 2);
      expect(largeWidth).toBe(64); // 2 chars * 16 pixels * 2 scale
    });
    
    it('should get font height', () => {
      const tinyHeight = renderer.getFontHeight('tiny', 1);
      expect(tinyHeight).toBe(4);
      
      const largeHeight = renderer.getFontHeight('large', 3);
      expect(largeHeight).toBe(48); // 16 * 3
    });
  });
  
  describe('font atlas loading', () => {
    it('should report fonts not ready initially', () => {
      const newRenderer = new TextRenderer();
      expect(newRenderer.fontsReady).toBe(false);
    });
    
    // Note: Actual image loading would need to be mocked in a browser environment
    // This is just checking the interface exists
    it('should have loadFontAtlas method', () => {
      expect(renderer.loadFontAtlas).toBeDefined();
      expect(typeof renderer.loadFontAtlas).toBe('function');
    });
  });
});