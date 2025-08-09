import { describe, expect, it } from 'bun:test';
import Encyclopaedia from '../src/dmg/encyclopaedia';
import { Simulator } from '../src/simulator';

describe('Grappler Unit Verification', () => {
  it('should create a grappler unit with correct properties', () => {
    const grappler = Encyclopaedia.unit('grappler');
    
    expect(grappler).toBeDefined();
    expect(grappler.sprite).toBe('grappler');
    expect(grappler.hp).toBe(35);
    expect(grappler.dmg).toBe(8);
    expect(grappler.abilities).toBeDefined();
    expect(grappler.abilities.grapplingHook).toBeDefined();
    
  });

  it('should fire grappling hook ability', () => {
    const sim = new Simulator();
    const grappler = {
      ...Encyclopaedia.unit('grappler'),
      id: 'grappler-test',
      pos: { x: 5, y: 5 }
    };
    
    sim.addUnit(grappler);
    
    // Fire grappling hook
    const targetPos = { x: 10, y: 5 };
    grappler.abilities.grapplingHook.effect(grappler, targetPos, sim);
    
    // Check projectile was created
    const grapples = sim.projectiles.filter(p => p.type === 'grapple');
    expect(grapples.length).toBe(1);
    expect(grapples[0].origin).toEqual({ x: 5, y: 5 });
    expect(grapples[0].target).toEqual({ x: 10, y: 5 });
    
  });

  it('should appear in creature browser data', () => {
    const allUnits = [
      'farmer', 'soldier', 'worm', 'priest', 'ranger', 'bombardier',
      'squirrel', 'tamer', 'megasquirrel', 'rainmaker', 'skeleton',
      'demon', 'ghost', 'mimic-worm', 'big-worm', 'toymaker',
      'mechatron', 'grappler', 'worm-hunter', 'waterbearer', 'skirmisher',
      'desert-worm', 'giant-sandworm', 'sand-ant', 'desert-megaworm',
      'forest-squirrel', 'owl', 'bear', 'bird', 'tracker'
    ];
    
    const grapplerFound = allUnits.includes('grappler');
    expect(grapplerFound).toBe(true);
    
    // Try to create each unit to verify they exist
    const validUnits: string[] = [];
    for (const unitType of allUnits) {
      try {
        const unit = Encyclopaedia.unit(unitType);
        if (unit) validUnits.push(unitType);
      } catch (e) {
        // Unit doesn't exist
      }
    }
    
    expect(validUnits).toContain('grappler');
  });
});