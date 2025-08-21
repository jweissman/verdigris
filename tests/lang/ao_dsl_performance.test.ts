import { describe, test, expect } from 'bun:test';
import { DSLCompiler } from '../../src/dmg/dsl_compiler';
import type { Unit } from '../../src/types/Unit';
import type { TickContext } from '../../src/core/tick_context';

describe('Ao DSL Performance', () => {
  const compiler = new DSLCompiler();
  
  // Mock unit
  const createUnit = (id: string, team: string): Unit => ({
    id,
    pos: { x: Math.random() * 100, y: Math.random() * 100 },
    team: team as any,
    hp: 50 + Math.random() * 50,
    maxHp: 100,
    state: 'idle',
    intendedMove: { x: 0, y: 0 },
    sprite: 'test',
    mass: 1,
    abilities: ['melee', 'ranged'],
    meta: {}
  });
  
  // Create mock units
  const units: Unit[] = [];
  for (let i = 0; i < 50; i++) {
    units.push(createUnit(`unit${i}`, i % 2 === 0 ? 'friendly' : 'hostile'));
  }
  
  let getAllUnitsCallCount = 0;
  
  // Mock context
  const mockContext: TickContext = {
    getAllUnits: () => {
      getAllUnitsCallCount++;
      return units;
    },
    getRandom: () => Math.random(),
    findUnitsInRadius: () => [],
    findUnitById: () => undefined,
    getUnitsInTeam: () => [],
    getUnitsAt: () => [],
    getUnitsInRect: () => [],
    queueCommand: () => {},
    queueEvent: () => {},
    getCurrentTick: () => 0,
    getFieldWidth: () => 100,
    getFieldHeight: () => 100,
    getProjectiles: () => [],
    getParticles: () => [],
    getTemperatureAt: () => 20,
    getSceneBackground: () => 'forest',
    isWinterActive: () => false,
    isSandstormActive: () => false,
    getSandstormIntensity: () => 0,
    getSandstormDuration: () => 0,
    getQueuedEvents: () => [],
    getUnitIndex: () => undefined,
    getArrays: () => ({
      posX: [],
      posY: [],
      activeIndices: [],
      team: [],
      state: [],
      unitIds: [],
      hp: [],
      maxHp: [],
      mass: [],
      dmg: []
    }),
    getUnitColdData: () => undefined,
    getUnitColdDataByIndex: () => undefined,
    isAbilityForced: () => false,
    findUnitIndicesInRadius: () => [],
    getActiveUnitIndices: () => [],
    getUnitIndicesWithAbilities: () => [],
    getUnitProxyByIndex: () => undefined,
  };
  
  test('DSL compiler caches getAllUnits calls within a single expression', () => {
    getAllUnitsCallCount = 0;
    
    // Complex expression that references units multiple times
    const expr = 'closest.enemy() && count.enemies_in_range(10) > 2';
    const fn = compiler.compile(expr);
    
    // Evaluate for a single unit
    fn(units[0], mockContext);
    
    // Should only call getAllUnits once per evaluation (cached within context)
    expect(getAllUnitsCallCount).toBe(1);
  });
  
  test('Multiple units evaluating same expression share compiled function', () => {
    compiler.clearCache();
    
    const expr = 'self.hp < 50';
    
    // Compile once
    const fn1 = compiler.compile(expr);
    
    // Should return same function
    const fn2 = compiler.compile(expr);
    
    expect(fn1).toBe(fn2);
  });
  
  test('DSL expressions evaluate quickly', () => {
    const expressions = [
      'self.hp < 50',
      'self.hp < self.maxHp * 0.5',
      'closest.enemy()?.hp > 0',
      'distance(closest.enemy()) <= 10',
      'count.enemies_in_range(5) >= 2'
    ];
    
    const start = performance.now();
    
    // Evaluate each expression for each unit
    for (const unit of units) {
      for (const expr of expressions) {
        const fn = compiler.compile(expr);
        fn(unit, mockContext);
      }
    }
    
    const elapsed = performance.now() - start;
    
    // 50 units * 5 expressions = 250 evaluations
    // Should complete in under 120ms (0.48ms per evaluation)
    expect(elapsed).toBeLessThan(120);
    
    const perEval = elapsed / 250;
    console.log(`Average time per DSL evaluation: ${perEval.toFixed(3)}ms`);
  });
  
  test('Cached units version avoids repeated getAllUnits calls', () => {
    getAllUnitsCallCount = 0;
    
    // Simulate what abilities rule should do
    const cachedUnits = mockContext.getAllUnits(); // Call once
    expect(getAllUnitsCallCount).toBe(1);
    
    // Now compile expressions with cached units
    const expr1 = compiler.compileWithCachedUnits('closest.enemy()', cachedUnits);
    const expr2 = compiler.compileWithCachedUnits('count.enemies_in_range(10)', cachedUnits);
    
    // Evaluate for multiple units
    for (let i = 0; i < 10; i++) {
      expr1(units[i], mockContext);
      expr2(units[i], mockContext);
    }
    
    // Should still only have called getAllUnits once (the initial cache)
    expect(getAllUnitsCallCount).toBe(1);
  });
  
  test('Complex ability triggers evaluate efficiently', () => {
    const abilityTriggers = [
      'self.hp < self.maxHp * 0.3',
      'closest.enemy() && distance(closest.enemy()) <= 5',
      'count.enemies_in_range(10) >= 3 && self.hp > 50',
      'weakest.ally()?.hp < 30',
      'healthiest.enemy()?.hp > self.hp * 2'
    ];
    
    const start = performance.now();
    
    // Simulate evaluating triggers for all units
    for (const unit of units) {
      for (const trigger of abilityTriggers) {
        const fn = compiler.compile(trigger);
        fn(unit, mockContext);
      }
    }
    
    const elapsed = performance.now() - start;
    
    // Should be fast even with complex expressions
    expect(elapsed).toBeLessThan(150);
  });
});