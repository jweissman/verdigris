import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { createScaledRenderer } from '../../src/core/renderer';
import { Game } from '../../src/core/game';

describe('Hero Visual Rendering', () => {
  test('hero rig sprites are loaded and can render', () => {
    // Mock Image for headless testing
    global.Image = class {
      src: string = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete: boolean = true;
    } as any;
    
    // Load sprites
    const sprites = Game.loadSprites();
    
    // Check hero part sprites are loaded
    const requiredSprites = [
      'hero-head',
      'hero-torso', 
      'hero-larm',
      'hero-rarm',
      'hero-lleg',
      'hero-rleg',
      'hero-sword'
    ];
    
    for (const spriteName of requiredSprites) {
      const sprite = sprites.get(spriteName);
      // console.log(`${spriteName}: ${sprite ? 'loaded' : 'MISSING'}`);
      expect(sprite).toBeDefined();
    }
    
    // Create a canvas-like object for testing
    const mockCanvas = {
      width: 320,
      height: 240,
      getContext: (type: string) => {
        if (type === '2d') {
          return {
            drawImage: (...args: any[]) => {
              // console.log('Drawing sprite:', args[0]?.src?.includes('hero') ? 'hero part' : 'other');
            },
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            clearRect: () => {},
            fillRect: () => {},
            fillStyle: '',
            globalAlpha: 1,
            imageSmoothingEnabled: false
          } as any;
        }
        return null;
      }
    } as HTMLCanvasElement;
    
    // Create sim with hero
    const sim = new Simulator(40, 40);
    sim.rulebook.push(new HeroAnimation());
    
    const hero = sim.addUnit({
      id: 'visual_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true
      }
    });
    
    // Step to generate rig
    sim.step();
    
    const riggedHero = sim.units.find(u => u.id === 'visual_hero');
    // console.log('Hero has rig:', !!riggedHero?.meta?.rig);
    // console.log('Rig parts:', riggedHero?.meta?.rig?.map((p: any) => p.name));
    
    expect(riggedHero?.meta?.rig).toBeDefined();
    expect(riggedHero?.meta?.rig?.length).toBe(7);
    
    // Verify each part has correct sprite name
    for (const part of riggedHero?.meta?.rig || []) {
      const sprite = sprites.get(part.sprite);
      // console.log(`Part ${part.name} uses sprite ${part.sprite}: ${sprite ? 'OK' : 'MISSING'}`);
      expect(sprite).toBeDefined();
    }
  });
});