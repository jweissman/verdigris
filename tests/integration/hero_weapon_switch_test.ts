import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import { HeroAnimation } from '../../src/rules/hero_animation';
import { PlayerControl } from '../../src/rules/player_control';

describe('Hero Weapon Switching', () => {
  test('hero can switch weapons using number keys', () => {
    const sim = new Simulator(40, 40);
    const playerControl = new PlayerControl();
    
    sim.rulebook.push(new HeroAnimation());
    sim.rulebook.push(playerControl);
    
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
    
    // Initial state - should have default sword
    sim.step();
    let heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBeUndefined(); // Default is sword
    
    // Switch to spear (key 2)
    playerControl.setKeyState('2', true);
    sim.step();
    playerControl.setKeyState('2', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('spear');
    
    // Switch to axe (key 3)
    playerControl.setKeyState('3', true);
    sim.step();
    playerControl.setKeyState('3', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('axe');
    
    // Switch to bow (key 4)
    playerControl.setKeyState('4', true);
    sim.step();
    playerControl.setKeyState('4', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('bow');
    
    // Switch back to sword (key 1)
    playerControl.setKeyState('1', true);
    sim.step();
    playerControl.setKeyState('1', false);
    
    heroUnit = sim.units.find(u => u.id === 'weapon_hero');
    expect(heroUnit?.meta?.weapon).toBe('sword');
  });
  
  test('weapon persists through movement and actions', () => {
    const sim = new Simulator(40, 40);
    const playerControl = new PlayerControl();
    
    sim.rulebook.push(new HeroAnimation());
    sim.rulebook.push(playerControl);
    
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
    
    // Switch to staff (key 6)
    playerControl.setKeyState('6', true);
    sim.step();
    playerControl.setKeyState('6', false);
    
    let heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    
    // Move right
    playerControl.setKeyState('d', true);
    sim.step();
    sim.step();
    playerControl.setKeyState('d', false);
    
    // Weapon should still be staff
    heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    expect(heroUnit?.pos.x).toBeGreaterThan(10);
    
    // Jump
    playerControl.setKeyState(' ', true);
    sim.step();
    playerControl.setKeyState(' ', false);
    
    // Weapon should still be staff
    heroUnit = sim.units.find(u => u.id === 'persist_hero');
    expect(heroUnit?.meta?.weapon).toBe('staff');
    expect(heroUnit?.meta?.jumping).toBe(true);
  });
});