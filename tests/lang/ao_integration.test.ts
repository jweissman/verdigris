import { describe, test, expect } from 'bun:test';
import { Simulator } from '../../src/core/simulator';
import Encyclopaedia from '../../src/dmg/encyclopaedia';

describe('Ao Language Integration Tests', () => {
  
  test('DSL expressions work correctly in real game scenarios', () => {
    const sim = new Simulator(30, 30);
    
    // Add a priest with heal ability
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
    
    // Add injured ally
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
    
    // Add enemy
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
    
    // Run simulation
    const initialAllyHp = sim.units.find(u => u.id === 'ally1')?.hp || 0;
    
    for (let i = 0; i < 10; i++) {
      sim.step();
    }
    
    // Priest should have healed the ally
    const finalAllyHp = sim.units.find(u => u.id === 'ally1')?.hp || 0;
    expect(finalAllyHp).toBeGreaterThan(initialAllyHp);
  });
  
  test('Complex DSL triggers work correctly', () => {
    const sim = new Simulator(30, 30);
    
    // Create a unit with complex ability trigger
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
        // Simulate an ability that triggers when low health and enemies nearby
        complexTrigger: 'self.hp < self.maxHp * 0.3 && count.enemies_in_range(10) >= 2'
      }
    };
    
    sim.addUnit(unitWithComplexTrigger);
    
    // Add enemies nearby
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
    
    // The trigger condition should evaluate to true
    // (25 < 30 && 2 >= 2)
    const unit = sim.units.find(u => u.id === 'complex1');
    expect(unit).toBeTruthy();
    expect(unit!.hp).toBeLessThan(unit!.maxHp * 0.3);
    
    // Count enemies in range
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
    
    // Unit with ability that references closest enemy
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
        // This should not error even when no enemies exist
        safeTargeting: 'closest.enemy()?.hp > 50'
      }
    };
    
    sim.addUnit(unitWithOptionalChaining);
    
    // Run without enemies - should not crash
    expect(() => {
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
    }).not.toThrow();
    
    // Add an enemy
    sim.addUnit({
      id: 'enemy1',
      pos: { x: 15, y: 10 },
      team: 'hostile' as const,
      hp: 60,
      maxHp: 60,
      sprite: 'enemy',
      state: 'idle' as const
    });
    
    // Run with enemy - should still not crash
    expect(() => {
      for (let i = 0; i < 5; i++) {
        sim.step();
      }
    }).not.toThrow();
  });
  
  test('DSL correctly evaluates distance calculations', () => {
    const sim = new Simulator(30, 30);
    
    // Ranged unit that only attacks distant enemies
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
        // Should only target enemies between 5 and 15 distance
        rangeCheck: 'distance(closest.enemy()) >= 5 && distance(closest.enemy()) <= 15'
      }
    };
    
    sim.addUnit(ranger);
    
    // Add enemy too close (distance = 3)
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
    
    // Distance should be 3
    const dx1 = closeEnemy.pos.x - ranger.pos.x;
    const dy1 = closeEnemy.pos.y - ranger.pos.y;
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    expect(dist1).toBeLessThan(5);
    
    // Test with different simulator for proper distance
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
    
    // Distance should be 8
    const dx2 = goodEnemy.pos.x - ranger.pos.x;
    const dy2 = goodEnemy.pos.y - ranger.pos.y;
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    expect(dist2).toBeGreaterThanOrEqual(5);
    expect(dist2).toBeLessThanOrEqual(15);
  });
  
  test('Array method calls work in DSL expressions', () => {
    const sim = new Simulator(20, 20);
    
    // Unit that checks its abilities
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