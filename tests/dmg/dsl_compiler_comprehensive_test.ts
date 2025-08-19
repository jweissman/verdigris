import { describe, expect, it } from 'bun:test';
import { dslCompiler } from '../../src/dmg/dsl_compiler';
import type { Unit } from '../../src/types/Unit';
import type { TickContext } from '../../src/core/tick_context';

describe('DSL Compiler Comprehensive Tests', () => {
  // Mock unit for testing
  const createMockUnit = (overrides?: Partial<Unit>): Unit => ({
    id: 'test-unit',
    pos: { x: 10, y: 10 },
    team: 'friendly',
    hp: 50,
    maxHp: 100,
    state: 'idle',
    sprite: 'test',
    intendedMove: { x: 0, y: 0 },
    ...overrides,
  } as Unit);

  // Mock context
  const createMockContext = (units: Unit[] = []): TickContext => ({
    getAllUnits: () => units,
    getRandom: () => Math.random(),
    getFieldWidth: () => 100,
    getFieldHeight: () => 100,
    getCurrentTick: () => 0,
    findUnitById: (id: string) => units.find(u => u.id === id) || null,
  } as TickContext);

  describe('Math expressions', () => {
    it('should evaluate Math.floor', () => {
      const expr = 'Math.floor(self.maxHp * 0.3)';
      const compiled = dslCompiler.compile(expr);
      const unit = createMockUnit({ maxHp: 100 });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(30);
    });

    it('should evaluate Math.ceil', () => {
      const expr = 'Math.ceil(self.hp / 3)';
      const compiled = dslCompiler.compile(expr);
      const unit = createMockUnit({ hp: 50 });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(17);
    });

    it('should evaluate Math.round', () => {
      const expr = 'Math.round(self.hp * 1.5)';
      const compiled = dslCompiler.compile(expr);
      const unit = createMockUnit({ hp: 33 });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(50);
    });
  });

  describe('Array literals and pick function', () => {
    it('should evaluate array literals', () => {
      const expr = "['wolf', 'bear', 'deer']";
      const compiled = dslCompiler.compile(expr);
      const unit = createMockUnit();
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toEqual(['wolf', 'bear', 'deer']);
    });

    it('should pick random element from array', () => {
      const expr = "pick(['squirrel', 'deer', 'wolf', 'bear'])";
      const compiled = dslCompiler.compile(expr);
      const unit = createMockUnit();
      
      // Mock context with controlled random
      let randomValue = 0.25; // Should pick 'deer' (index 1)
      const context = {
        ...createMockContext(),
        getRandom: () => randomValue,
      } as TickContext;
      
      const result = compiled(unit, context);
      expect(result).toBe('deer');
      
      // Test with different random value
      randomValue = 0.75; // Should pick 'bear' (index 3)
      const result2 = compiled(unit, context);
      expect(result2).toBe('bear');
    });
  });

  describe('Helper functions', () => {
    it('should find closest enemy', () => {
      const expr = 'closest.enemy()';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ pos: { x: 10, y: 10 }, team: 'friendly' });
      const enemy1 = createMockUnit({ 
        id: 'enemy1', 
        pos: { x: 15, y: 10 }, 
        team: 'hostile' 
      });
      const enemy2 = createMockUnit({ 
        id: 'enemy2', 
        pos: { x: 20, y: 10 }, 
        team: 'hostile' 
      });
      
      const context = createMockContext([unit, enemy1, enemy2]);
      const result = compiled(unit, context);
      
      expect(result?.id).toBe('enemy1');
    });

    it('should find healthiest enemy', () => {
      const expr = 'healthiest.enemy()';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ team: 'friendly' });
      const enemy1 = createMockUnit({ 
        id: 'enemy1', 
        hp: 50, 
        maxHp: 100, 
        team: 'hostile' 
      });
      const enemy2 = createMockUnit({ 
        id: 'enemy2', 
        hp: 80, 
        maxHp: 100, 
        team: 'hostile' 
      });
      
      const context = createMockContext([unit, enemy1, enemy2]);
      const result = compiled(unit, context);
      
      expect(result?.id).toBe('enemy2');
    });

    it('should find healthiest enemy in range', () => {
      const expr = 'healthiest.enemy_in_range(10)';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ pos: { x: 10, y: 10 }, team: 'friendly' });
      const closeEnemy = createMockUnit({ 
        id: 'close', 
        pos: { x: 15, y: 10 }, 
        hp: 50, 
        maxHp: 100, 
        team: 'hostile' 
      });
      const farEnemy = createMockUnit({ 
        id: 'far', 
        pos: { x: 30, y: 10 }, 
        hp: 100, 
        maxHp: 100, 
        team: 'hostile' 
      });
      
      const context = createMockContext([unit, closeEnemy, farEnemy]);
      const result = compiled(unit, context);
      
      // Should only find the close enemy since far is out of range
      expect(result?.id).toBe('close');
    });

    it('should find weakest ally', () => {
      const expr = 'weakest.ally()';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ hp: 50, team: 'friendly' });
      const ally1 = createMockUnit({ 
        id: 'ally1', 
        hp: 30, 
        team: 'friendly' 
      });
      const ally2 = createMockUnit({ 
        id: 'ally2', 
        hp: 70, 
        team: 'friendly' 
      });
      
      const context = createMockContext([unit, ally1, ally2]);
      const result = compiled(unit, context);
      
      expect(result?.id).toBe('ally1');
    });
  });

  describe('Distance calculations', () => {
    it('should calculate distance to unit', () => {
      const expr = 'distance(closest.enemy())';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ pos: { x: 10, y: 10 } });
      const enemy = createMockUnit({ 
        id: 'enemy', 
        pos: { x: 14, y: 13 }, 
        team: 'hostile' 
      });
      
      const context = createMockContext([unit, enemy]);
      const result = compiled(unit, context);
      
      expect(result).toBe(5); // 3-4-5 triangle
    });

    it('should handle optional chaining in distance', () => {
      const expr = 'distance(closest.enemy()?.pos)';
      const compiled = dslCompiler.compile(expr);
      
      // No enemies case
      const unit = createMockUnit();
      const context = createMockContext([unit]);
      const result = compiled(unit, context);
      
      expect(result).toBe(Infinity);
    });
  });

  describe('Complex expressions', () => {
    it('should evaluate conditional expressions', () => {
      const expr = 'self.hp < self.maxHp * 0.5';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ hp: 40, maxHp: 100 });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(true);
    });

    it('should handle logical operators', () => {
      const expr = 'self.hp > 20 && self.hp < 80';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ hp: 50 });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(true);
    });

    it('should handle property access chains', () => {
      const expr = 'self.meta.summoned';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ 
        meta: { summoned: true } 
      });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(true);
    });

    it('should handle method calls on arrays', () => {
      const expr = "self.tags.includes('construct')";
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit({ 
        tags: ['mechanical', 'construct', 'electrical'] 
      });
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const expr = 'self.nonexistent || 10';
      const compiled = dslCompiler.compile(expr);
      
      const unit = createMockUnit();
      const context = createMockContext();
      
      const result = compiled(unit, context);
      expect(result).toBe(10);
    });

    it('should handle null coalescing', () => {
      const expr = 'closest.enemy() || self';
      const compiled = dslCompiler.compile(expr);
      
      // No enemies, should return self
      const unit = createMockUnit();
      const context = createMockContext([unit]);
      
      const result = compiled(unit, context);
      expect(result.id).toBe('test-unit');
    });
  });
});