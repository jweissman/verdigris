import { describe, expect, it } from 'bun:test';
import { dslCompiler } from '../../src/dmg/dsl_compiler';
import type { Unit } from '../../src/types/Unit';
import type { TickContext } from '../../src/core/tick_context';

describe('DSL Compiler', () => {
  const mockUnit: Unit = {
    id: 'test',
    pos: { x: 5, y: 5 },
    team: 'friendly' as any,
    hp: 10,
    maxHp: 20,
    state: 'idle' as any,
    abilities: [],
    speed: 1,
    radius: 1,
    damage: 1,
    tags: []
  };

  const enemyUnit: Unit = {
    id: 'enemy',
    pos: { x: 7, y: 5 },
    team: 'hostile' as any,
    hp: 15,
    maxHp: 15,
    state: 'idle' as any,
    abilities: [],
    speed: 1,
    radius: 1,
    damage: 1,
    tags: []
  };

  const mockContext: TickContext = {
    getAllUnits: () => [mockUnit, enemyUnit],
    getCurrentTick: () => 100,
    isAbilityForced: () => false
  } as any;

  describe('literals and identifiers', () => {
    it('should compile true', () => {
      const fn = dslCompiler.compile('true');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile false', () => {
      const fn = dslCompiler.compile('false');
      expect(fn(mockUnit, mockContext)).toBe(false);
    });

    it('should compile numbers', () => {
      const fn = dslCompiler.compile('42');
      expect(fn(mockUnit, mockContext)).toBe(42);
    });

    it('should compile strings', () => {
      const fn = dslCompiler.compile('"hello"');
      expect(fn(mockUnit, mockContext)).toBe('hello');
    });

    it('should access self', () => {
      const fn = dslCompiler.compile('self');
      expect(fn(mockUnit, mockContext)).toBe(mockUnit);
    });
  });

  describe('property access', () => {
    it('should access self.hp', () => {
      const fn = dslCompiler.compile('self.hp');
      expect(fn(mockUnit, mockContext)).toBe(10);
    });

    it('should access self.maxHp', () => {
      const fn = dslCompiler.compile('self.maxHp');
      expect(fn(mockUnit, mockContext)).toBe(20);
    });

    it('should access self.pos.x', () => {
      const fn = dslCompiler.compile('self.pos.x');
      expect(fn(mockUnit, mockContext)).toBe(5);
    });
  });

  describe('comparisons', () => {
    it('should compile <', () => {
      const fn = dslCompiler.compile('self.hp < 15');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile >', () => {
      const fn = dslCompiler.compile('self.hp > 5');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile ==', () => {
      const fn = dslCompiler.compile('self.hp == 10');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile !=', () => {
      const fn = dslCompiler.compile('self.team != "hostile"');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });
  });

  describe('arithmetic', () => {
    it('should compile multiplication', () => {
      const fn = dslCompiler.compile('self.maxHp * 0.5');
      expect(fn(mockUnit, mockContext)).toBe(10);
    });

    it('should compile addition', () => {
      const fn = dslCompiler.compile('self.hp + 5');
      expect(fn(mockUnit, mockContext)).toBe(15);
    });
  });

  describe('logical operators', () => {
    it('should compile &&', () => {
      const fn = dslCompiler.compile('self.hp > 5 && self.hp < 15');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile ||', () => {
      const fn = dslCompiler.compile('self.hp < 5 || self.hp > 100');
      expect(fn(mockUnit, mockContext)).toBe(false);
    });

    it('should compile !', () => {
      const fn = dslCompiler.compile('!false');
      expect(fn(mockUnit, mockContext)).toBe(true);
    });
  });

  describe('closest helper', () => {
    it('should find closest enemy', () => {
      const fn = dslCompiler.compile('closest');
      const result = fn(mockUnit, mockContext);
      expect(result).toBeDefined();
      expect(result.enemy).toBeDefined();
      expect(typeof result.enemy).toBe('function');
    });

    it('should return enemy unit when calling closest.enemy()', () => {
      const fn = dslCompiler.compile('closest.enemy()');
      const result = fn(mockUnit, mockContext);
      expect(result).toBe(enemyUnit);
    });

    it('should handle closest.enemy()?.pos', () => {
      const fn = dslCompiler.compile('closest.enemy()?.pos');
      const result = fn(mockUnit, mockContext);
      expect(result).toEqual({ x: 7, y: 5 });
    });
  });

  describe('distance function', () => {
    it('should calculate distance to a position', () => {
      // Verify components work
      const enemyFn = dslCompiler.compile('closest.enemy()');
      const enemy = enemyFn(mockUnit, mockContext);
      expect(enemy).toBeDefined();
      expect(enemy.pos).toEqual({ x: 7, y: 5 });
      
      const posFn = dslCompiler.compile('closest.enemy()?.pos');  
      const pos = posFn(mockUnit, mockContext);
      expect(pos).toEqual({ x: 7, y: 5 });
      
      // Now test distance
      const fn = dslCompiler.compile('distance(closest.enemy()?.pos)');
      const result = fn(mockUnit, mockContext);
      expect(result).toBe(2); // Distance from (5,5) to (7,5)
    });

    it('should return Infinity for null target', () => {
      const fn = dslCompiler.compile('distance(null)');
      const result = fn(mockUnit, mockContext);
      expect(result).toBe(Infinity);
    });

    it('should return Infinity for undefined target', () => {
      const fn = dslCompiler.compile('distance(undefined)');
      const result = fn(mockUnit, mockContext);
      expect(result).toBe(Infinity);
    });
  });

  describe('complex ability triggers', () => {
    it('should compile ranged ability trigger', () => {
      const trigger = 'distance(closest.enemy()?.pos) <= 10 && distance(closest.enemy()?.pos) > 2';
      const fn = dslCompiler.compile(trigger);
      
      // Enemy is at distance 2, which is NOT > 2, so should be false
      expect(fn(mockUnit, mockContext)).toBe(false);
      
      // Move enemy further away
      enemyUnit.pos.x = 10; // Now distance is 5
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile simple distance check', () => {
      const trigger = 'distance(closest.enemy()?.pos) <= 2';
      const fn = dslCompiler.compile(trigger);
      
      enemyUnit.pos.x = 7; // Reset position, distance = 2
      expect(fn(mockUnit, mockContext)).toBe(true);
    });

    it('should compile HP-based trigger', () => {
      const trigger = 'self.hp < self.maxHp * 0.5';
      const fn = dslCompiler.compile(trigger);
      
      expect(fn(mockUnit, mockContext)).toBe(false); // 10 is not < 10
      
      mockUnit.hp = 9;
      expect(fn(mockUnit, mockContext)).toBe(true); // 9 < 10
    });
  });

  describe('optional chaining', () => {
    it('should handle optional chaining on null', () => {
      const contextNoEnemies: TickContext = {
        getAllUnits: () => [mockUnit],
        getCurrentTick: () => 100,
        isAbilityForced: () => false
      } as any;

      const fn = dslCompiler.compile('closest.enemy()?.pos');
      const result = fn(mockUnit, contextNoEnemies);
      expect(result).toBe(undefined);
    });

    it('should handle distance with optional chaining', () => {
      const contextNoEnemies: TickContext = {
        getAllUnits: () => [mockUnit],
        getCurrentTick: () => 100,
        isAbilityForced: () => false
      } as any;

      const fn = dslCompiler.compile('distance(closest.enemy()?.pos)');
      const result = fn(mockUnit, contextNoEnemies);
      expect(result).toBe(Infinity); // No enemy, so distance is Infinity
    });
  });

  describe('tameMegabeast ability expressions', () => {
    it('should handle array includes method', () => {
      const megabeastUnit: Unit = {
        ...enemyUnit,
        tags: ['titan', 'megabeast'],
        mass: 50
      };
      
      const contextWithMegabeast: TickContext = {
        getAllUnits: () => [mockUnit, megabeastUnit],
        getCurrentTick: () => 100,
        isAbilityForced: () => false
      } as any;

      const expr = "closest.enemy()?.tags?.includes('megabeast')";
      const compiled = dslCompiler.compile(expr);
      
      const result = compiled(mockUnit, contextWithMegabeast);
      expect(result).toBe(true);
    });

    it('should compile complete tameMegabeast trigger', () => {
      const megabeastUnit: Unit = {
        ...enemyUnit,
        pos: { x: 7, y: 5 }, // Distance 2 from mockUnit
        tags: ['titan', 'megabeast'],
        mass: 50
      };
      
      const contextWithMegabeast: TickContext = {
        getAllUnits: () => [mockUnit, megabeastUnit],
        getCurrentTick: () => 100,
        isAbilityForced: () => false
      } as any;

      const triggerExpr = "distance(closest.enemy()?.pos) <= 3 && closest.enemy()?.tags?.includes('megabeast')";
      const compiledTrigger = dslCompiler.compile(triggerExpr);
      
      const result = compiledTrigger(mockUnit, contextWithMegabeast);
      expect(result).toBe(true);
    });

    it('should return false when no megabeast enemy exists', () => {
      const regularEnemyUnit: Unit = {
        ...enemyUnit,
        tags: ['undead']
      };
      
      const contextWithoutMegabeast: TickContext = {
        getAllUnits: () => [mockUnit, regularEnemyUnit],
        getCurrentTick: () => 100,
        isAbilityForced: () => false
      } as any;

      const triggerExpr = "distance(closest.enemy()?.pos) <= 3 && closest.enemy()?.tags?.includes('megabeast')";
      const compiledTrigger = dslCompiler.compile(triggerExpr);
      
      const result = compiledTrigger(mockUnit, contextWithoutMegabeast);
      expect(result).toBe(false);
    });
  });
});