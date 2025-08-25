import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero Weapon Switching', () => {
  test('hero can switch weapons using number keys', () => {
    const sim = new Simulator(40, 40);
    const playerControl: PlayerControl = sim.rules.find(r => r.constructor === PlayerControl);
    
    const hero = sim.addUnit({
      id: 'weapon_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true,
        controlled: true
      }
    });
    

    sim.step();
    let heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBeUndefined(); // Default is sword

    playerControl.setKeyState('2', true);
    sim.step();
    playerControl.setKeyState('2', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('spear');
    

    playerControl.setKeyState('3', true);
    sim.step();
    playerControl.setKeyState('3', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('axe');
    

    playerControl.setKeyState('4', true);
    sim.step();
    playerControl.setKeyState('4', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('bow');
    

    playerControl.setKeyState('1', true);
    sim.step();
    playerControl.setKeyState('1', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('sword');
  });
  
  test('weapon persists through movement and actions', () => {
    const sim = new Simulator(40, 40);
    const playerControl: PlayerControl = sim.rules.find(r => r.constructor === PlayerControl);
    //  new PlayerControl();
    
    const hero = sim.addUnit({
      id: 'persist_hero',
      pos: { x: 10, y: 10 },
      hp: 100,
      team: 'friendly',
      tags: ['hero'],
      meta: {
        useRig: true,
        controlled: true
      }
    });
    

    playerControl.setKeyState('6', true);
    sim.step();
    playerControl.setKeyState('6', false);
    
    let heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    

    playerControl.setKeyState('d', true);
    // Need a few steps for movement with cooldown
    for (let i = 0; i < 4; i++) {
      sim.step();
    }
    playerControl.setKeyState('d', false);
    

    heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    expect(heroUnit?.pos.x).toBeGreaterThan(10);
    

    playerControl.setKeyState(' ', true);
    sim.step();
    playerControl.setKeyState(' ', false);
    

    heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    expect(heroUnit?.meta?.jumping).toBe(true);
  });
});