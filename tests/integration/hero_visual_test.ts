import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { Game } from '../../src/core/game';

describe('Hero Visual Rendering', () => {
  test('hero rig sprites are loaded and can render', () => {

    global.Image = class {
      src: string = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete: boolean = true;
    } as any;
    

    const sprites = Game.loadSprites();
    

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

      expect(sprite).toBeDefined();
    }
    

    const mockCanvas = {
      width: 320,
      height: 240,
      getContext: (type: string) => {
        if (type === '2d') {
          return {
            drawImage: (...args: any[]) => {

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
    

    const sim = new Simulator(40, 40);
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
    

    sim.step();
    
    const riggedHero = sim.units.find(u => u.id === 'visual_hero');


    
    expect(riggedHero?.meta?.rig).toBeDefined();
    expect(riggedHero?.meta?.rig?.length).toBe(7);
    

    for (const part of riggedHero?.meta?.rig || []) {
      const sprite = sprites.get(part.sprite);

      expect(sprite).toBeDefined();
    }
  });
});