import { describe, test, expect } from 'bun:test';
import { HeroRig } from '../../../src/rendering/hero_rig';

describe('Hero Rig Weapon System', () => {
  test('can switch between weapons', () => {
    const rig = new HeroRig();
    
    // Default weapon should be sword
    expect(rig.getCurrentWeapon()).toBe('sword');
    
    // Switch to spear
    rig.switchWeapon('spear');
    expect(rig.getCurrentWeapon()).toBe('spear');
    
    // Switch to bow
    rig.switchWeapon('bow');
    expect(rig.getCurrentWeapon()).toBe('bow');
    
    // Switch to none (unarmed)
    rig.switchWeapon('none');
    expect(rig.getCurrentWeapon()).toBe('none');
  });
  
  test('weapon part updates when switching', () => {
    const rig = new HeroRig();
    
    // Get initial sword part
    const swordPart = rig.getPartByName('sword');
    expect(swordPart).toBeDefined();
    expect(swordPart?.sprite).toBe('hero-sword');
    
    // Switch to axe
    rig.switchWeapon('axe');
    const axePart = rig.getPartByName('sword'); // Still uses 'sword' part name
    expect(axePart?.sprite).toBe('hero-axe');
    
    // Switch to none
    rig.switchWeapon('none');
    const noPart = rig.getPartByName('sword');
    expect(noPart?.sprite).toBe('');
    expect(noPart?.scale).toBe(0);
  });
  
  test('weapon follows hand during animation', () => {
    const rig = new HeroRig();
    rig.play('breathing');
    
    // Get initial weapon position
    const weaponInitial = rig.getPartByName('sword');
    const initialX = weaponInitial?.offset.x || 0;
    
    // Advance animation
    for (let i = 0; i < 30; i++) {
      rig.update(1);
    }
    
    // Weapon should have moved with hand
    const weaponFinal = rig.getPartByName('sword');
    const finalX = weaponFinal?.offset.x || 0;
    
    // Position should have changed as hand moves
    expect(finalX).not.toBe(initialX);
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
    
    // Try to switch to invalid weapon
    rig.switchWeapon('invalid' as any);
    
    // Should still have default sword
    expect(rig.getCurrentWeapon()).toBe('sword');
  });
});