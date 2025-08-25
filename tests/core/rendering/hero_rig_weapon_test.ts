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
    

    const armInitial = rig.getPartByName('rarm');
    const weaponInitial = rig.getPartByName('sword');
    const initialArmX = armInitial?.offset.x || 0;
    const initialWeaponX = weaponInitial?.offset.x || 0;
    

    for (let i = 0; i < 30; i++) {
      rig.update(1);
    }
    

    const armFinal = rig.getPartByName('rarm');
    const weaponFinal = rig.getPartByName('sword');
    const finalArmX = armFinal?.offset.x || 0;
    const finalWeaponX = weaponFinal?.offset.x || 0;
    

    // Sword should maintain fixed offset from arm
    // If arm moves, sword moves with it
    const initialOffset = initialWeaponX - initialArmX;
    const finalOffset = finalWeaponX - finalArmX;
    expect(Math.abs(finalOffset - initialOffset)).toBeLessThan(5);
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