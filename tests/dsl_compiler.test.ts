import { describe, it, expect } from 'bun:test';
import { DSLCompiler } from '../src/dmg/dsl_compiler';
import type { Unit } from '../src/types/Unit';
import type { TickContext } from '../src/core/tick_context';

describe('DSL Compiler', () => {
  const compiler = new DSLCompiler();
  

  const mockUnit: Unit = {
    id: 'test-unit',
    pos: { x: 10, y: 10 },
    team: 'friendly',
    hp: 50,
    maxHp: 100,
    state: 'idle',
    intendedMove: { x: 0, y: 0 },
    sprite: 'test',
    mass: 1,
    abilities: [],
    meta: {}
  };
  

  const mockContext: TickContext = {
    getAllUnits: () => [
      mockUnit,
      { ...mockUnit, id: 'enemy1', team: 'hostile', pos: { x: 15, y: 10 } },
      { ...mockUnit, id: 'ally1', team: 'friendly', pos: { x: 5, y: 10 } }
    ],
    getRandom: () => 0.5,
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
    getRandom: () => Math.random(),
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
  
  describe('Literals', () => {
    it('should parse numbers', () => {
      const fn = compiler.compile('42');
      expect(fn(mockUnit, mockContext)).toBe(42);
    });
    
    it('should parse decimals', () => {
      const fn = compiler.compile('3.14');
      expect(fn(mockUnit, mockContext)).toBe(3.14);
    });
    
    it('should parse booleans', () => {
      expect(compiler.compile('true')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('false')(mockUnit, mockContext)).toBe(false);
    });
    
    it('should parse null', () => {
      const fn = compiler.compile('null');
      expect(fn(mockUnit, mockContext)).toBe(null);
    });
    
    it('should parse strings', () => {
      const fn = compiler.compile('"hello"');
      expect(fn(mockUnit, mockContext)).toBe('hello');
    });
  });
  
  describe('Operators', () => {
    it('should handle arithmetic', () => {
      expect(compiler.compile('2 + 3')(mockUnit, mockContext)).toBe(5);
      expect(compiler.compile('10 - 4')(mockUnit, mockContext)).toBe(6);
      expect(compiler.compile('3 * 4')(mockUnit, mockContext)).toBe(12);
      expect(compiler.compile('15 / 3')(mockUnit, mockContext)).toBe(5);
    });
    
    it('should handle comparisons', () => {
      expect(compiler.compile('5 > 3')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('5 < 3')(mockUnit, mockContext)).toBe(false);
      expect(compiler.compile('5 >= 5')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('5 <= 4')(mockUnit, mockContext)).toBe(false);
      expect(compiler.compile('5 == 5')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('5 != 3')(mockUnit, mockContext)).toBe(true);
    });
    
    it('should handle logical operators', () => {
      expect(compiler.compile('true && true')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('true && false')(mockUnit, mockContext)).toBe(false);
      expect(compiler.compile('true || false')(mockUnit, mockContext)).toBe(true);
      expect(compiler.compile('false || false')(mockUnit, mockContext)).toBe(false);
    });
  });
  
  describe('Built-in identifiers', () => {
    it('should resolve self', () => {
      const fn = compiler.compile('self.hp');
      expect(fn(mockUnit, mockContext)).toBe(50);
    });
    
    it('should resolve unit properties', () => {
      const fn = compiler.compile('hp');
      expect(fn(mockUnit, mockContext)).toBe(50);
    });
    
    it('should resolve maxHp', () => {
      const fn = compiler.compile('maxHp');
      expect(fn(mockUnit, mockContext)).toBe(100);
    });
  });
  
  describe('Functions', () => {
    it('should call distance function', () => {
      const fn = compiler.compile('distance(self.pos)');
      expect(fn(mockUnit, mockContext)).toBe(0); // Distance to self
    });
    
    it('should find closest enemy', () => {
      const fn = compiler.compile('closest.enemy()');
      const result = fn(mockUnit, mockContext);
      expect(result).toBeTruthy();
      expect(result.id).toBe('enemy1');
    });
    
    it('should find closest ally', () => {
      const fn = compiler.compile('closest.ally()');
      const result = fn(mockUnit, mockContext);
      expect(result).toBeTruthy();
      expect(result.id).toBe('ally1');
    });
    
    it('should count enemies in range', () => {
      const fn = compiler.compile('count.enemies_in_range(10)');
      expect(fn(mockUnit, mockContext)).toBe(1);
    });
  });
  
  describe('Optional chaining', () => {
    it('should handle optional chaining', () => {
      const fn = compiler.compile('closest.enemy()?.pos');
      const result = fn(mockUnit, mockContext);
      expect(result).toEqual({ x: 15, y: 10 });
    });
    
    it('should return undefined for missing optional chain', () => {
      const emptyContext = { ...mockContext, getAllUnits: () => [mockUnit] };
      const fn = compiler.compile('closest.enemy()?.pos');
      expect(fn(mockUnit, emptyContext)).toBe(undefined);
    });
  });
  
  describe('Complex expressions', () => {
    it('should handle distance checks', () => {
      const fn = compiler.compile('distance(closest.enemy()?.pos) <= 10');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });
    
    it('should handle HP comparisons', () => {
      const fn = compiler.compile('self.hp < self.maxHp * 0.5');
      expect(fn(mockUnit, mockContext)).toBe(false); // 50 < 50 is false
    });
    
    it('should handle count triggers', () => {
      const fn = compiler.compile('count.enemies_in_range(10) >= 1');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });
  });
  
  describe('Array literals', () => {
    it('should parse array literals', () => {
      const fn = compiler.compile('[1, 2, 3]');
      const result = fn(mockUnit, mockContext);
      expect(result).toEqual([1, 2, 3]);
    });
    
    it('should parse string arrays', () => {
      const fn = compiler.compile('["a", "b", "c"]');
      const result = fn(mockUnit, mockContext);
      expect(result).toEqual(['a', 'b', 'c']);
    });
    
    it('should handle pick with array literal', () => {

      const testContext = { ...mockContext, getRandom: () => 0 };
      const fn = compiler.compile('pick(["first", "second", "third"])');
      expect(fn(mockUnit, testContext)).toBe('first');
    });
  });
});