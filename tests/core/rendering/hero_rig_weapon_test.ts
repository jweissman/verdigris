import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../../src/rendering/hero_rig';

describe('Hero Rig Weapon System', () => {
  test('can switch between weapons', () => {
    const rig = new HeroRig();
    

    expect(rig.getCurrentWeapon()).toBe('sword');
    

    rig.switchWeapon('spear');
    expect(rig.getCurrentWeapon()).toBe('spear');
    

    rig.switchWeapon('bow');
    expect(rig.getCurrentWeapon()).toBe('bow');
    

    rig.switchWeapon('none');
    expect(rig.getCurrentWeapon()).toBe('none');
  });
  
  test('weapon part updates when switching', () => {
    const rig = new HeroRig();
    

    const swordPart = rig.getPartByName('sword');
    expect(swordPart).toBeDefined();
    expect(swordPart?.sprite).toBe('hero-sword');
    

    rig.switchWeapon('axe');
    const axePart = rig.getPartByName('sword'); // Still uses 'sword' part name
    expect(axePart?.sprite).toBe('hero-axe');
    

    rig.switchWeapon('none');
    const noPart = rig.getPartByName('sword');
    expect(noPart?.sprite).toBe('');
    expect(noPart?.scale).toBe(0);
  });
  
  test('weapon follows hand during animation', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    

    const weaponInitial = rig.getPartByName('sword');
    const initialX = weaponInitial?.offset.x || 0;
    

    for (let i = 0; i < 30; i++) {
      rig.update(1);
    }
    

    const weaponFinal = rig.getPartByName('sword');
    const finalX = weaponFinal?.offset.x || 0;
    

    // Sword position should change as arm moves during breathing
    expect(Math.abs(finalX - initialX)).toBeGreaterThan(0.01);
  });
  
  test('available weapons list', () => {
    const rig = new HeroRig();
    const weapons = rig.getAvailableWeapons();
    
    expect(weapons).toContain('sword');
    expect(weapons).toContain('spear');
    expect(weapons).toContain('axe');
    expect(weapons).toContain('bow');
    expect(weapons).toContain('shield');
    expect(weapons).toContain('staff');
    expect(weapons).toContain('none');
    expect(weapons.length).toBe(7);
  });
  
  test('invalid weapon type is ignored', () => {
    const rig = new HeroRig();
    

    rig.switchWeapon('invalid' as any);
    

    expect(rig.getCurrentWeapon()).toBe('sword');
  });
});