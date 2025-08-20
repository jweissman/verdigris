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
    const huntResult = UnitOperations.huntAggressively(clanker, enemies as any, mockSim);
    

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
    
    expect(deployAbility.maxUses).toBe(4);
    

    const clanker = Encyclopaedia.unit('clanker');
    expect(clanker.abilities).not.toContain('deployBot');
  });
  

  it('should test construct AI will engage enemies immediately upon spawn', () => {
    const sim = new Simulator();
    
    const enemy1 = { ...Encyclopaedia.unit('worm'), pos: { x: 8, y: 5 }, team: 'hostile' as const, id: 'enemy1' };
    const enemy2 = { ...Encyclopaedia.unit('worm'), pos: { x: 12, y: 7 }, team: 'hostile' as const, id: 'enemy2' };
    sim.addUnit(enemy1);
    sim.addUnit(enemy2);
    
    const freezebot = { ...Encyclopaedia.unit('freezebot'), pos: { x: 10, y: 6 }, team: 'friendly' as const, id: 'freezebot' };
    sim.addUnit(freezebot);
    
    const initialDistance1 = Math.sqrt(Math.pow(8 - 10, 2) + Math.pow(5 - 6, 2));
    const initialDistance2 = Math.sqrt(Math.pow(12 - 10, 2) + Math.pow(7 - 6, 2));
    
    // Run simulation for several steps
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    const bot = sim.units.find(u => u.id === 'freezebot');
    expect(bot).toBeDefined();
    
    // Check that the freezebot has moved toward enemies
    const finalDistance1 = Math.sqrt(Math.pow(enemy1.pos.x - bot!.pos.x, 2) + Math.pow(enemy1.pos.y - bot!.pos.y, 2));
    const finalDistance2 = Math.sqrt(Math.pow(enemy2.pos.x - bot!.pos.x, 2) + Math.pow(enemy2.pos.y - bot!.pos.y, 2));
    
    // Bot should have moved closer to at least one enemy
    const movedCloserToEnemy1 = finalDistance1 < initialDistance1;
    const movedCloserToEnemy2 = finalDistance2 < initialDistance2;
    expect(movedCloserToEnemy1 || movedCloserToEnemy2).toBe(true);
    
    // Check that freezebot has appropriate hunt-related properties
    expect(bot!.tags).toContain('hunt');
    
    // If posture is set, verify it's appropriate
    if (bot!.posture) {
      expect(['hunt', 'aggressive', 'berserk']).toContain(bot!.posture);
    }
  });
});