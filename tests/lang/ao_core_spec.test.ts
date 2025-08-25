import { describe, test, expect } from 'bun:test';
import { Ao } from '../../src/lang/ao';

/**
 * Core Ao Language Specification
 * 
 * Tests the minimal, essential features that Ao must support
 * for the DSL compiler to work correctly.
 * 
 * Ao is NOT trying to be JavaScript. It's a minimal expression language
 * that compiles strings like "u.hp > 5" into evaluable expressions.
 */
describe('Ao Core Language Specification', () => {
  
  describe('1. Basic Evaluation', () => {
    test('evaluates literals correctly', () => {
      expect(Ao.eval('42')).toBe(42);
      expect(Ao.eval('3.14')).toBe(3.14);
      expect(Ao.eval('true')).toBe(true);
      expect(Ao.eval('false')).toBe(false);
      expect(Ao.eval('null')).toBe(null);
      expect(Ao.eval('undefined')).toBe(undefined);
      expect(Ao.eval('"hello"')).toBe('hello');
      expect(Ao.eval("'world'")).toBe('world');
    });
    
    test('evaluates arithmetic correctly', () => {
      expect(Ao.eval('2 + 3')).toBe(5);
      expect(Ao.eval('10 - 4')).toBe(6);
      expect(Ao.eval('3 * 4')).toBe(12);
      expect(Ao.eval('15 / 3')).toBe(5);
      expect(Ao.eval('17 % 5')).toBe(2);
    });
    
    test('respects operator precedence', () => {
      expect(Ao.eval('2 + 3 * 4')).toBe(14);
      expect(Ao.eval('(2 + 3) * 4')).toBe(20);
      expect(Ao.eval('10 - 2 * 3')).toBe(4);
      expect(Ao.eval('(10 - 2) * 3')).toBe(24);
    });
    
    test('evaluates comparisons correctly', () => {
      expect(Ao.eval('5 > 3')).toBe(true);
      expect(Ao.eval('5 < 3')).toBe(false);
      expect(Ao.eval('5 >= 5')).toBe(true);
      expect(Ao.eval('5 <= 4')).toBe(false);
      expect(Ao.eval('5 == 5')).toBe(true);
      expect(Ao.eval('5 != 3')).toBe(true);
    });
    
    test('evaluates logical operators with short-circuiting', () => {
      expect(Ao.eval('true && true')).toBe(true);
      expect(Ao.eval('true && false')).toBe(false);
      expect(Ao.eval('false && true')).toBe(false);
      expect(Ao.eval('true || false')).toBe(true);
      expect(Ao.eval('false || false')).toBe(false);
      expect(Ao.eval('!true')).toBe(false);
      expect(Ao.eval('!false')).toBe(true);
    });
  });
  
  describe('2. Context Variables', () => {
    test('resolves simple variables from context', () => {
      const ctx = { x: 10, y: 20, name: 'test' };
      expect(Ao.eval('x', ctx)).toBe(10);
      expect(Ao.eval('y', ctx)).toBe(20);
      expect(Ao.eval('name', ctx)).toBe('test');
    });
    
    test('returns undefined for missing variables', () => {
      expect(Ao.eval('missing', {})).toBe(undefined);
      expect(Ao.eval('x', {})).toBe(undefined);
    });
    
    test('resolves nested property access', () => {
      const ctx = {
        unit: {
          hp: 100,
          pos: { x: 5, y: 10 },
          team: 'friendly'
        }
      };
      
      expect(Ao.eval('unit.hp', ctx)).toBe(100);
      expect(Ao.eval('unit.pos.x', ctx)).toBe(5);
      expect(Ao.eval('unit.pos.y', ctx)).toBe(10);
      expect(Ao.eval('unit.team', ctx)).toBe('friendly');
    });
    
    test('handles array access', () => {
      const ctx = {
        items: [10, 20, 30],
        matrix: [[1, 2], [3, 4]]
      };
      
      expect(Ao.eval('items[0]', ctx)).toBe(10);
      expect(Ao.eval('items[1]', ctx)).toBe(20);
      expect(Ao.eval('items[2]', ctx)).toBe(30);
      expect(Ao.eval('matrix[0][0]', ctx)).toBe(1);
      expect(Ao.eval('matrix[1][1]', ctx)).toBe(4);
    });
  });
  
  describe('3. Function Calls', () => {
    test('calls context functions with arguments', () => {
      const ctx = {
        add: (a: number, b: number) => a + b,
        multiply: (x: number) => x * 2,
        getZero: () => 0
      };
      
      expect(Ao.eval('add(3, 4)', ctx)).toBe(7);
      expect(Ao.eval('multiply(5)', ctx)).toBe(10);
      expect(Ao.eval('getZero()', ctx)).toBe(0);
    });
    
    test('returns undefined for non-existent functions', () => {
      expect(Ao.eval('missing()', {})).toBe(undefined);
      expect(Ao.eval('foo(1, 2)', {})).toBe(undefined);
    });
    
    test('evaluates function arguments', () => {
      const ctx = {
        add: (a: number, b: number) => a + b,
        x: 5,
        y: 3
      };
      
      expect(Ao.eval('add(x, y)', ctx)).toBe(8);
      expect(Ao.eval('add(2 * 3, 4 + 1)', ctx)).toBe(11);
    });
  });
  
  describe('4. Method Calls', () => {
    test('calls methods on objects', () => {
      const ctx = {
        text: 'hello',
        nums: [1, 2, 3]
      };
      
      expect(Ao.eval('text.toUpperCase()', ctx)).toBe('HELLO');
      expect(Ao.eval('text.substring(0, 2)', ctx)).toBe('he');
      expect(Ao.eval('nums.includes(2)', ctx)).toBe(true);
      expect(Ao.eval('nums.includes(5)', ctx)).toBe(false);
    });
    
    test('chains method calls', () => {
      const ctx = {
        text: '  hello  '
      };
      
      expect(Ao.eval('text.trim()', ctx)).toBe('hello');
      expect(Ao.eval('text.trim().toUpperCase()', ctx)).toBe('HELLO');
      expect(Ao.eval('text.trim().substring(0, 3)', ctx)).toBe('hel');
    });
  });
  
  describe('5. Optional Chaining', () => {
    test('safely accesses properties with ?.', () => {
      const ctx = {
        user: { name: 'Alice', profile: { age: 30 } },
        empty: null,
        missing: undefined
      };
      
      expect(Ao.eval('user?.name', ctx)).toBe('Alice');
      expect(Ao.eval('user?.profile?.age', ctx)).toBe(30);
      expect(Ao.eval('empty?.name', ctx)).toBe(undefined);
      expect(Ao.eval('missing?.profile?.age', ctx)).toBe(undefined);
    });
    
    test('safely calls methods with ?.', () => {
      const ctx = {
        obj: { getValue: () => 42 },
        nullObj: null
      };
      
      expect(Ao.eval('obj?.getValue()', ctx)).toBe(42);
      expect(Ao.eval('nullObj?.getValue()', ctx)).toBe(undefined);
    });
    
    test('chains optional access correctly', () => {
      const ctx = {
        a: { b: { c: { d: 'found' } } },
        x: { y: null }
      };
      
      expect(Ao.eval('a?.b?.c?.d', ctx)).toBe('found');
      expect(Ao.eval('x?.y?.z?.w', ctx)).toBe(undefined);
    });
  });
  
  describe('6. Arrays', () => {
    test('creates array literals', () => {
      expect(Ao.eval('[]')).toEqual([]);
      expect(Ao.eval('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(Ao.eval('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
      expect(Ao.eval('[true, false, null]')).toEqual([true, false, null]);
    });
    
    test('evaluates expressions in arrays', () => {
      const ctx = { x: 10, y: 20 };
      expect(Ao.eval('[x, y, x + y]', ctx)).toEqual([10, 20, 30]);
      expect(Ao.eval('[1 + 1, 2 * 3, 10 / 2]', ctx)).toEqual([2, 6, 5]);
    });
    
    test('accesses array properties', () => {
      const ctx = { arr: [1, 2, 3] };
      expect(Ao.eval('arr.length', ctx)).toBe(3);
      expect(Ao.eval('[1, 2, 3, 4, 5].length', ctx)).toBe(5);
    });
  });
  
  describe('7. DSL Use Cases', () => {
    test('evaluates unit health checks', () => {
      const ctx = {
        self: { hp: 30, maxHp: 100 },
        unit: { hp: 50, maxHp: 100 }
      };
      
      expect(Ao.eval('self.hp < 50', ctx)).toBe(true);
      expect(Ao.eval('self.hp < self.maxHp * 0.5', ctx)).toBe(true);
      expect(Ao.eval('unit.hp > 40', ctx)).toBe(true);
    });
    
    test('evaluates distance calculations', () => {
      const ctx = {
        distance: (target: any) => {
          if (!target?.pos) return Infinity;
          return Math.abs(target.pos.x - 5) + Math.abs(target.pos.y - 5);
        },
        enemy: { pos: { x: 8, y: 5 } }
      };
      
      expect(Ao.eval('distance(enemy) <= 5', ctx)).toBe(true);
      expect(Ao.eval('distance(enemy) > 10', ctx)).toBe(false);
    });
    
    test('evaluates team checks', () => {
      const ctx = {
        self: { team: 'friendly' },
        target: { team: 'hostile' }
      };
      
      expect(Ao.eval('self.team == "friendly"', ctx)).toBe(true);
      expect(Ao.eval('target.team != self.team', ctx)).toBe(true);
      expect(Ao.eval('target.team == "hostile"', ctx)).toBe(true);
    });
    
    test('evaluates ability checks', () => {
      const ctx = {
        self: { abilities: ['jump', 'heal', 'buff'] }
      };
      
      expect(Ao.eval('self.abilities.includes("jump")', ctx)).toBe(true);
      expect(Ao.eval('self.abilities.includes("teleport")', ctx)).toBe(false);
      expect(Ao.eval('self.abilities.length > 2', ctx)).toBe(true);
    });
    
    test('evaluates complex combat conditions', () => {
      const ctx = {
        self: { hp: 25, maxHp: 100, team: 'friendly' },
        closest: {
          enemy: () => ({ hp: 80, pos: { x: 10, y: 10 } }),
          ally: () => ({ hp: 20, maxHp: 100 })
        },
        distance: (t: any) => t?.pos ? 5 : Infinity,
        count: {
          enemies_in_range: (r: number) => r >= 10 ? 3 : 1
        }
      };
      

      expect(Ao.eval('self.hp < 30 && closest.enemy()', ctx)).toBeTruthy();
      

      expect(Ao.eval('self.hp < self.maxHp * 0.3 && count.enemies_in_range(10) > 2', ctx))
        .toBe(true);
      

      expect(Ao.eval('closest.ally()?.hp < 30', ctx)).toBe(true);
      

      expect(Ao.eval('closest.enemy()?.hp > 50 && distance(closest.enemy()) <= 10', ctx))
        .toBe(true);
    });
  });
  
  describe('8. Error Handling', () => {
    test('returns undefined for parse errors', () => {
      expect(Ao.eval('{')).toBe(undefined);
      expect(Ao.eval('1 +')).toBe(undefined);
      expect(Ao.eval('(1 + 2')).toBe(undefined);
    });
    
    test('returns undefined for property access on null/undefined', () => {
      const ctx = { nullValue: null, undefinedValue: undefined };
      expect(Ao.eval('nullValue.prop', ctx)).toBe(undefined);
      expect(Ao.eval('undefinedValue.prop', ctx)).toBe(undefined);
      expect(Ao.eval('missing.prop.deep', ctx)).toBe(undefined);
    });
    
    test('returns undefined for invalid method calls', () => {
      const ctx = { value: 42 };
      expect(Ao.eval('value.notAMethod()', ctx)).toBe(undefined);
      expect(Ao.eval('value.toString().notAMethod()', ctx)).toBe(undefined);
    });
  });
  
  describe('9. Edge Cases', () => {
    test('handles empty expressions', () => {
      expect(Ao.eval('')).toBe(undefined);
      expect(Ao.eval('   ')).toBe(undefined);
    });
    
    test('handles deeply nested expressions', () => {
      const ctx = { x: 1 };
      expect(Ao.eval('((((x))))', ctx)).toBe(1);
      expect(Ao.eval('1 + (2 * (3 + (4 * 5)))', ctx)).toBe(47);
    });
    
    test('handles mixed types in comparisons', () => {
      expect(Ao.eval('5 == "5"')).toBe(true); // == allows coercion
      expect(Ao.eval('0 == false')).toBe(true);
      expect(Ao.eval('1 == true')).toBe(true);
      expect(Ao.eval('null == undefined')).toBe(true);
    });
    
    test('handles division by zero', () => {
      expect(Ao.eval('1 / 0')).toBe(Infinity);
      expect(Ao.eval('-1 / 0')).toBe(-Infinity);
      expect(isNaN(Ao.eval('0 / 0'))).toBe(true);
    });
  });
  
  describe('10. Performance', () => {
    test('evaluates simple expressions quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        Ao.eval('x + y', { x: 10, y: 20 });
      }
      const elapsed = performance.now() - start;
      

      expect(elapsed).toBeLessThan(50);
    });
    
    test('handles complex contexts efficiently', () => {
      const bigContext: any = {};
      for (let i = 0; i < 100; i++) {
        bigContext[`var${i}`] = i;
      }
      
      const start = performance.now();
      Ao.eval('var50 + var51', bigContext);
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(10);
    });
  });
});