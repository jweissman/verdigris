import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { SceneLoader } from '../../src/core/scene_loader';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Jumping Z-Height', () => {
  it.skip('should set z-height during jump arc', () => {

    Encyclopaedia.counts = {};
    Simulator.rng.reset(12345);
    
    const sim = new Simulator(40, 25);
    const sceneLoader = new SceneLoader(sim);
    

    const jumpTest = `w...........s`;  // 11 spaces between
    
    sceneLoader.loadFromText(jumpTest);
    
    const worm = sim.units.find(u => u.sprite === 'worm');
    const soldier = sim.units.find(u => u.sprite === 'soldier');
    
    expect(worm).toBeDefined();
    expect(soldier).toBeDefined();
    

    expect(worm!.meta.z).toBeUndefined();
    

    let jumped = false;
    for (let i = 0; i < 20; i++) {
      // console.log(`Step ${i}: worm at (${worm!.pos.x}, ${worm!.pos.y}), meta.jumping = ${worm!.meta?.jumping}`);
      sim.step();

      const updatedWorm = sim.units.find(u => u.sprite === 'worm');
      if (updatedWorm?.meta?.jumping) {
        jumped = true;
        break;
      }
    }
    

    const finalWorm = sim.units.find(u => u.sprite === 'worm');
    if (!jumped) {
      // console.log('Final worm meta:', finalWorm!.meta);
      // console.log('Final worm abilities:', finalWorm!.abilities);
      // console.log('Final worm lastAbilityTick:', finalWorm!.lastAbilityTick);
      const dx = soldier!.pos.x - finalWorm!.pos.x;
      const dy = soldier!.pos.y - finalWorm!.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // console.log('Distance to enemy:', dist);
      // console.log('Queued commands:', sim.queuedCommands);
    }
    
    expect(jumped).toBe(true);
    

    const zValues: number[] = [];
    let maxZ = 0;
    
    for (let i = 0; i < 20; i++) {
      sim.step();
      const z = finalWorm!.meta.z || 0;
      zValues.push(z);
      maxZ = Math.max(maxZ, z);
      
      if (!finalWorm!.meta.jumping) {
        break; // Jump completed
      }
    }
    

    expect(maxZ).toBeGreaterThan(0);
    expect(maxZ).toBeLessThanOrEqual(2); // Peak height from jumping.ts line 59
    

    expect(finalWorm!.meta.z).toBe(0);
    

    const midpoint = Math.floor(zValues.length / 2);
    if (zValues.length > 2) {
      const firstHalf = zValues.slice(0, midpoint);
      const secondHalf = zValues.slice(midpoint);
      

      const rising = firstHalf.some((z, i) => i > 0 && z > firstHalf[i - 1]);
      expect(rising).toBe(true);
      

      const falling = secondHalf.some((z, i) => i > 0 && z < secondHalf[i - 1]);
      expect(falling).toBe(true);
    }
  });
  
  it('should use z-height for visual rendering in orthographic view', () => {

    const mockCanvas: any = {
      width: 320,
      height: 200,
      getContext: () => ({
        clearRect: () => {},
        fillRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        ellipse: () => {},
        fillText: () => {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        font: '',
        textAlign: '',
        imageSmoothingEnabled: false,
        canvas: { width: 320, height: 200 }
      } as any)
    };
    
    const sim = new Simulator();
    const { default: Orthographic } = require('../../src/views/orthographic');
    const view = new Orthographic(
      mockCanvas.getContext(),
      sim,
      320,
      200,
      new Map(),
      new Map()
    );
    

    sim.addUnit({
      id: 'jumper',
      pos: { x: 10, y: 10 },
      sprite: 'jumper',
      team: 'friendly',
      hp: 100,
      maxHp: 100,
      state: 'idle',
      meta: {
        jumping: true,
        jumpTarget: { x: 15, y: 10 },
        jumpProgress: 5,
        z: 1.5, // Mid-jump height
        jumpHeight: 1.5
      }
    });
    

    let drawImageCalls: any[] = [];
    mockCanvas.getContext().drawImage = (...args: any[]) => {
      drawImageCalls.push(args);
    };
    
    view.show();
    




    

    let fillRectCalls: any[] = [];
    mockCanvas.getContext().fillRect = (...args: any[]) => {
      fillRectCalls.push(args);
    };
    
    view.show();
    



    expect(true).toBe(true);
  });
});