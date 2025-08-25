import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroController } from '../../src/mwe/hero_controller';

describe('Hero Jump Mechanics', () => {
  test('hero jump command creates proper meta fields', () => {
    const sim = new Simulator(30, 20);
    const controller = new HeroController(sim);
    

    controller.spawnHero(10, 10);
    
    const hero = sim.units.find(u => u.id === 'hero_player');
    expect(hero).toBeDefined();
    expect(hero?.pos.x).toBe(10);
    expect(hero?.pos.y).toBe(10);
    

    controller.handleKeyDown(' ');
    

    sim.step();
    

    const jumpingHero = sim.units.find(u => u.id === 'hero_player');
    expect(jumpingHero?.meta?.jumping).toBe(true);
    expect(jumpingHero?.meta?.jumpOrigin).toEqual({ x: 10, y: 10 });
    expect(jumpingHero?.meta?.jumpTarget).toEqual({ x: 14, y: 10 }); // 4 tiles right
    expect(jumpingHero?.meta?.jumpHeight).toBe(5);
    



  });
  
  test('hero completes jump arc', () => {
    const sim = new Simulator(30, 20);
    const controller = new HeroController(sim);
    
    controller.spawnHero(10, 10);
    controller.handleKeyDown(' ');
    

    const jumpPath: Array<{x: number, y: number, z: number}> = [];
    
    for (let i = 0; i < 25; i++) {  // Increased to account for longer jump
      sim.step();
      const hero = sim.units.find(u => u.id === 'hero_player');
      if (!hero) break;
      
      jumpPath.push({
        x: hero.pos.x,
        y: hero.pos.y,
        z: hero.meta?.z || 0
      });
      
      if (!hero.meta?.jumping) {

        break;
      }
    }
    

    expect(jumpPath.length).toBeGreaterThan(0);
    

    const maxHeightIdx = jumpPath.reduce((maxIdx, p, idx) => 
      p.z > jumpPath[maxIdx].z ? idx : maxIdx, 0);
    
    expect(maxHeightIdx).toBeGreaterThan(0); // Not at start
    expect(maxHeightIdx).toBeLessThan(jumpPath.length - 1); // Not at end
    

    jumpPath.forEach((p, i) => {

    });
    

    const finalPos = jumpPath[jumpPath.length - 1];
    expect(finalPos.x).toBeCloseTo(14, 0); // Should land at x=14
    expect(finalPos.z).toBeCloseTo(0, 1); // Should be on ground (allowing small rounding)
  });
  
  test('hero cannot jump while jumping', () => {
    const sim = new Simulator(30, 20);
    const controller = new HeroController(sim);
    
    controller.spawnHero(10, 10);
    

    controller.handleKeyDown(' ');
    sim.step();
    
    const hero1 = sim.units.find(u => u.id === 'hero_player');
    expect(hero1?.meta?.jumping).toBe(true);
    

    const commandsBefore = sim.queuedCommands.length;
    controller.handleKeyDown(' ');
    const commandsAfter = sim.queuedCommands.length;
    

    expect(commandsAfter).toBe(commandsBefore);
    

  });
  
  test('hero movement updates facing direction', () => {
    const sim = new Simulator(30, 20);
    const controller = new HeroController(sim);
    
    controller.spawnHero(10, 10);
    

    controller.handleKeyDown('d');
    controller.update();
    sim.step();
    
    let hero = sim.units.find(u => u.id === 'hero_player');
    expect(hero?.meta?.facing).toBe('right');
    

    controller.handleKeyUp('d');
    controller.handleKeyDown('a');
    controller.update();
    sim.step();
    
    hero = sim.units.find(u => u.id === 'hero_player');
    expect(hero?.meta?.facing).toBe('left');
    

  });
});