import { describe, test, expect } from 'bun:test';
import { HeroGame } from '../../src/mwe/hero';

describe('Hero MWE Ready Check', () => {
  test('hero MWE can bootstrap and create hero', () => {
    // Mock canvas
    const mockCanvas = {
      width: 320,
      height: 240,
      getContext: () => ({
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        clearRect: () => {},
        fillRect: () => {},
        fillStyle: '',
        globalAlpha: 1,
        imageSmoothingEnabled: false,
        scale: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        fill: () => {},
        arc: () => {},
        strokeStyle: '',
        lineWidth: 1,
        stroke: () => {}
      } as any)
    } as HTMLCanvasElement;
    
    // Mock Image
    global.Image = class {
      src: string = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete: boolean = true;
    } as any;
    
    // Create game
    const game = new HeroGame(mockCanvas, {
      addInputListener: () => {},
      animationFrame: () => {}
    });
    
    // Bootstrap
    game.bootstrap();
    
    // Check hero was created
    const hero = game.sim.units.find(u => u.tags?.includes('hero'));
    console.log('Hero created:', {
      exists: !!hero,
      id: hero?.id,
      pos: hero?.pos,
      tags: hero?.tags,
      hasRig: hero?.meta?.useRig
    });
    
    expect(hero).toBeDefined();
    expect(hero?.tags).toContain('hero');
    expect(hero?.meta?.useRig).toBe(true);
    
    // Check rules are added
    const hasHeroAnimation = game.sim.rulebook.some(
      r => r.constructor.name === 'HeroAnimation'
    );
    const hasPlayerControl = game.sim.rulebook.some(
      r => r.constructor.name === 'PlayerControl'
    );
    
    console.log('Rules added:', {
      heroAnimation: hasHeroAnimation,
      playerControl: hasPlayerControl
    });
    
    expect(hasHeroAnimation).toBe(true);
    expect(hasPlayerControl).toBe(true);
    
    // Step to generate rig
    game.sim.step();
    
    const heroWithRig = game.sim.units.find(u => u.tags?.includes('hero'));
    console.log('Hero after step:', {
      hasRig: !!heroWithRig?.meta?.rig,
      rigParts: heroWithRig?.meta?.rig?.length
    });
    
    expect(heroWithRig?.meta?.rig).toBeDefined();
    expect(heroWithRig?.meta?.rig?.length).toBe(7);
  });
});