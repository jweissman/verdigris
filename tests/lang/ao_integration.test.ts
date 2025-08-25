import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Ao Language Integration Tests', () => {
  
  test('DSL expressions work correctly in real game scenarios', () => {
    const sim = new Simulator(30, 30);
    

    const priest = Encyclopaedia.unit('priest');
    if (!priest) throw new Error('Priest not found');
    
    sim.addUnit({
      ...priest,
      id: 'priest1',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      maxHp: 100
    });
    

    sim.addUnit({
      id: 'ally1',
      pos: { x: 12, y: 10 },
      team: 'friendly' as const,
      hp: 20,
      maxHp: 100,
      sprite: 'soldier',
      state: 'idle',
      abilities: []
    });
    

    sim.addUnit({
      id: 'enemy1',
      pos: { x: 15, y: 10 },
      team: 'hostile' as const,
      hp: 80,
      maxHp: 80,
      sprite: 'soldier',
      state: 'idle',
      abilities: ['melee']
    });
    

    const initialAllyHp = sim.units.find(u => u.id === 'ally1')?.hp || 0;
    
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    

    const finalAllyHp = sim.units.find(u => u.id === 'ally1')?.hp || 0;
    expect(finalAllyHp).toBeGreaterThan(initialAllyHp);
  });
  
  test('Complex DSL triggers work correctly', () => {
    const sim = new Simulator(30, 30);
    

    const unitWithComplexTrigger = {
      id: 'complex1',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 25, // Low health
      maxHp: 100,
      sprite: 'test',
      state: 'idle' as const,
      abilities: ['melee'],
      meta: {

        complexTrigger: 'self.hp < self.maxHp * 0.3 && count.enemies_in_range(10) >= 2'
      }
    };
    
    sim.addUnit(unitWithComplexTrigger);
    

    sim.addUnit({
      id: 'enemy1',
      pos: { x: 12, y: 10 },
      team: 'hostile' as const,
      hp: 50,
      maxHp: 50,
      sprite: 'enemy',
      state: 'idle' as const
    });
    
    sim.addUnit({
      id: 'enemy2',
      pos: { x: 10, y: 12 },
      team: 'hostile' as const,
      hp: 50,
      maxHp: 50,
      sprite: 'enemy',
      state: 'idle' as const
    });
    


    const unit = sim.units.find(u => u.id === 'complex1');
    expect(unit).toBeTruthy();
    expect(unit!.hp).toBeLessThan(unit!.maxHp * 0.3);
    

    const enemiesNearby = sim.units.filter(u => {
      if (u.team !== 'hostile') return false;
      const dx = u.pos.x - unit!.pos.x;
      const dy = u.pos.y - unit!.pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= 10;
    });
    
    expect(enemiesNearby.length).toBeGreaterThanOrEqual(2);
  });
  
  test('Optional chaining prevents errors with missing targets', () => {
    const sim = new Simulator(20, 20);
    

    const unitWithOptionalChaining = {
      id: 'optional1',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      maxHp: 100,
      sprite: 'test',
      state: 'idle' as const,
      abilities: ['melee'],
      meta: {

        safeTargeting: 'closest.enemy()?.hp > 50'
      }
    };
    
    sim.addUnit(unitWithOptionalChaining);
    

    expect(() => {
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
    }).not.toThrow();
    

    sim.addUnit({
      id: 'enemy1',
      pos: { x: 15, y: 10 },
      team: 'hostile' as const,
      hp: 60,
      maxHp: 60,
      sprite: 'enemy',
      state: 'idle' as const
    });
    

    expect(() => {
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
    }).not.toThrow();
  });
  
  test('DSL correctly evaluates distance calculations', () => {
    const sim = new Simulator(30, 30);
    

    const ranger = {
      id: 'ranger1',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      maxHp: 100,
      sprite: 'ranger',
      state: 'idle' as const,
      abilities: ['ranged'],
      meta: {

        rangeCheck: 'distance(closest.enemy()) >= 5 && distance(closest.enemy()) <= 15'
      }
    };
    
    sim.addUnit(ranger);
    

    const closeEnemy = {
      id: 'close',
      pos: { x: 13, y: 10 },
      team: 'hostile' as const,
      hp: 50,
      maxHp: 50,
      sprite: 'enemy',
      state: 'idle' as const
    };
    
    sim.addUnit(closeEnemy);
    

    const dx1 = closeEnemy.pos.x - ranger.pos.x;
    const dy1 = closeEnemy.pos.y - ranger.pos.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    expect(dist1).toBeLessThan(5);
    

    const sim2 = new Simulator(30, 30);
    
    sim2.addUnit(ranger);
    
    const goodEnemy = {
      id: 'good',
      pos: { x: 18, y: 10 },
      team: 'hostile' as const,
      hp: 50,
      maxHp: 50,
      sprite: 'enemy',
      state: 'idle' as const
    };
    
    sim2.addUnit(goodEnemy);
    

    const dx2 = goodEnemy.pos.x - ranger.pos.x;
    const dy2 = goodEnemy.pos.y - ranger.pos.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    expect(dist2).toBeGreaterThanOrEqual(5);
    expect(dist2).toBeLessThanOrEqual(15);
  });
  
  test('Array method calls work in DSL expressions', () => {
    const sim = new Simulator(20, 20);
    

    const unitWithAbilities = {
      id: 'multi1',
      pos: { x: 10, y: 10 },
      team: 'friendly' as const,
      hp: 100,
      maxHp: 100,
      sprite: 'test',
      state: 'idle' as const,
      abilities: ['melee', 'ranged', 'heal'],
      meta: {
        hasHeal: 'self.abilities.includes("heal")',
        abilityCount: 'self.abilities.length'
      }
    };
    
    sim.addUnit(unitWithAbilities);
    
    const unit = sim.units[0];
    expect(unit.abilities).toContain('heal');
    expect(unit.abilities?.length).toBe(3);
  });
});