import { describe, expect, it } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';
import { UnitOperations } from '../../src/UnitOperations';
import { Abilities } from '../../src/rules/abilities';

describe('Construct Hunting Behavior', () => {
  it('should verify all constructs have hunt tags', () => {
    
    const constructTypes = ['clanker', 'freezebot', 'spiker', 'swarmbot', 'roller', 'mechatron'];
    
    for (const constructType of constructTypes) {
      const construct = Encyclopaedia.unit(constructType);
      expect(construct.tags).toContain('hunt');
    }
    

    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.tags).toContain('aggressive');
  });
  
  it('should test aggressive clanker behavior toward enemy groups', () => {

    const clanker = { ...Encyclopaedia.unit('clanker'), pos: { x: 5, y: 5 }, id: 'test-clanker' };
    

    const enemies = [
      { pos: { x: 15, y: 10 }, team: 'hostile' as const },
      { pos: { x: 17, y: 8 }, team: 'hostile' as const },  
      { pos: { x: 20, y: 12 }, team: 'hostile' as const }
    ];
    

    const mockSim = { ticks: 10 };
    const huntResult = UnitOperations.huntAggressively(clanker, enemies, mockSim);
    

    const expectedCenterX = (15 + 17 + 20) / 3; // ~17.33
    const expectedCenterY = (10 + 8 + 12) / 3;  // 10
    
    expect(huntResult.posture).toBe('berserk');
    expect(huntResult.intendedMove.x).toBeGreaterThan(0); // Moving right toward enemies

    expect(Math.abs(huntResult.intendedMove.x) + Math.abs(huntResult.intendedMove.y)).toBeGreaterThan(0); // Should be moving in some direction
  });
  
  it('should verify deployment limits prevent field overload', () => {
    
    const toymaker = Encyclopaedia.unit('toymaker');
    expect(toymaker.abilities).toContain('deployBot');
    const deployAbility = Abilities.all.deployBot;
    
    expect(deployAbility.maxUses).toBe(5);
    

    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.abilities).not.toContain('deployBot');
  });
  

  // NOTE: Doesn't seem to actually test anything useful??
  it('should test construct AI will engage enemies immediately upon spawn', () => {
    
    const sim = new Simulator();
    

    const enemy1 = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const };
    const enemy2 = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 7 }, team: 'hostile' as const };
    sim.addUnit(enemy1);
    sim.addUnit(enemy2);
    

    const freezebot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 10, y: 6 }, team: 'friendly' as const };
    sim.addUnit(freezebot);
    
    

    expect(freezebot.tags).toContain('hunt');
    
  });
});