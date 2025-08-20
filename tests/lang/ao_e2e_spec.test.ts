import { describe, test, expect } from 'bun:test';
import { Ao } from '../../src/lang/ao';

/**
 * Comprehensive End-to-End Specification for Ao Language
 * 
 * Ao is a minimal, typesafe expression language designed for game DSLs.
 * It provides a clean grammar for evaluating expressions in a controlled context.
 * 
 * Core Principles:
 * 1. Safety: No arbitrary code execution, only expression evaluation
 * 2. Simplicity: Minimal syntax, easy to understand
 * 3. Extensibility: Context-based, can add new functions/values
 * 4. Performance: Grammar-based parsing with caching
 */
describe('Ao Language E2E Specification', () => {
  
  describe('1. Literals and Basic Types', () => {
    test('numbers: integers and floats', () => {
      expect(Ao.eval('42')).toBe(42);
      expect(Ao.eval('3.14')).toBe(3.14);
      expect(Ao.eval('0')).toBe(0);
      expect(Ao.eval('1000000')).toBe(1000000);
    });

    test('strings: single and double quotes', () => {
      expect(Ao.eval('"hello"')).toBe('hello');
      expect(Ao.eval("'world'")).toBe('world');
      expect(Ao.eval('""')).toBe('');
      expect(Ao.eval("'with spaces'")).toBe('with spaces');
    });

    test('booleans: true and false', () => {
      expect(Ao.eval('true')).toBe(true);
      expect(Ao.eval('false')).toBe(false);
    });

    test('null and undefined', () => {
      expect(Ao.eval('null')).toBe(null);
      expect(Ao.eval('undefined')).toBe(undefined);
    });

    test('arrays: literal syntax', () => {
      expect(Ao.eval('[]')).toEqual([]);
      expect(Ao.eval('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(Ao.eval('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
      expect(Ao.eval('[1, "two", true, null]')).toEqual([1, 'two', true, null]);
    });

    test('objects: literal syntax', () => {
      expect(Ao.eval('{}')).toEqual({});
      expect(Ao.eval('{"x": 10, "y": 20}')).toEqual({ x: 10, y: 20 });
      expect(Ao.eval('{"name": "test", "value": 42}')).toEqual({ name: 'test', value: 42 });
    });
  });

  describe('2. Operators', () => {
    describe('Arithmetic operators', () => {
      test('addition and subtraction', () => {
        expect(Ao.eval('2 + 3')).toBe(5);
        expect(Ao.eval('10 - 4')).toBe(6);
        expect(Ao.eval('1.5 + 2.5')).toBe(4);
      });

      test('multiplication and division', () => {
        expect(Ao.eval('3 * 4')).toBe(12);
        expect(Ao.eval('10 / 2')).toBe(5);
        expect(Ao.eval('7 % 3')).toBe(1);
      });

      test('operator precedence', () => {
        expect(Ao.eval('2 + 3 * 4')).toBe(14);
        expect(Ao.eval('(2 + 3) * 4')).toBe(20);
        expect(Ao.eval('10 - 2 * 3')).toBe(4);
      });

      test('unary operators', () => {
        expect(Ao.eval('-5')).toBe(-5);
        expect(Ao.eval('--5')).toBe(5);
        expect(Ao.eval('!true')).toBe(false);
        expect(Ao.eval('!false')).toBe(true);
      });
    });

    describe('Comparison operators', () => {
      test('equality and inequality', () => {
        expect(Ao.eval('5 == 5')).toBe(true);
        expect(Ao.eval('5 != 3')).toBe(true);
        expect(Ao.eval('"hello" == "hello"')).toBe(true);
        expect(Ao.eval('true == false')).toBe(false);
      });

      test('relational operators', () => {
        expect(Ao.eval('5 > 3')).toBe(true);
        expect(Ao.eval('3 < 5')).toBe(true);
        expect(Ao.eval('5 >= 5')).toBe(true);
        expect(Ao.eval('3 <= 5')).toBe(true);
      });
    });

    describe('Logical operators', () => {
      test('AND operator', () => {
        expect(Ao.eval('true && true')).toBe(true);
        expect(Ao.eval('true && false')).toBe(false);
        expect(Ao.eval('false && true')).toBe(false);
      });

      test('OR operator', () => {
        expect(Ao.eval('true || false')).toBe(true);
        expect(Ao.eval('false || false')).toBe(false);
        expect(Ao.eval('false || true')).toBe(true);
      });

      test('short-circuit evaluation', () => {
        const context = {
          getValue: () => 42,
          shouldNotCall: () => { throw new Error('Should not be called'); }
        };
        
        // AND short-circuits on false
        expect(Ao.eval('false && shouldNotCall()', context)).toBe(false);
        
        // OR short-circuits on true
        expect(Ao.eval('true || shouldNotCall()', context)).toBe(true);
      });
    });
  });

  describe('3. Context and Variable Resolution', () => {
    test('accessing context variables', () => {
      const context = {
        x: 10,
        y: 20,
        name: 'test'
      };
      
      expect(Ao.eval('x', context)).toBe(10);
      expect(Ao.eval('y', context)).toBe(20);
      expect(Ao.eval('name', context)).toBe('test');
    });

    test('nested object access', () => {
      const context = {
        unit: {
          pos: { x: 5, y: 10 },
          hp: 100,
          team: 'friendly'
        }
      };
      
      expect(Ao.eval('unit.pos.x', context)).toBe(5);
      expect(Ao.eval('unit.hp', context)).toBe(100);
      expect(Ao.eval('unit.team', context)).toBe('friendly');
    });

    test('array index access', () => {
      const context = {
        items: ['sword', 'shield', 'potion'],
        matrix: [[1, 2], [3, 4]]
      };
      
      expect(Ao.eval('items[0]', context)).toBe('sword');
      expect(Ao.eval('items[2]', context)).toBe('potion');
      expect(Ao.eval('matrix[1][1]', context)).toBe(4);
    });
  });

  describe('4. Function Calls', () => {
    test('calling context functions', () => {
      const context = {
        add: (a: number, b: number) => a + b,
        greet: (name: string) => `Hello, ${name}!`,
        getMax: (...nums: number[]) => Math.max(...nums)
      };
      
      expect(Ao.eval('add(3, 4)', context)).toBe(7);
      expect(Ao.eval('greet("World")', context)).toBe('Hello, World!');
      expect(Ao.eval('getMax(1, 5, 3, 9, 2)', context)).toBe(9);
    });

    test('method calls on objects', () => {
      const context = {
        text: 'hello world',
        numbers: [1, 2, 3, 4, 5]
      };
      
      expect(Ao.eval('text.toUpperCase()', context)).toBe('HELLO WORLD');
      expect(Ao.eval('text.substring(0, 5)', context)).toBe('hello');
      expect(Ao.eval('numbers.includes(3)', context)).toBe(true);
      expect(Ao.eval('numbers.filter(n => n > 2)', context)).toEqual([3, 4, 5]);
    });

    test('chained method calls', () => {
      const context = {
        text: '  hello world  '
      };
      
      expect(Ao.eval('text.trim().toUpperCase()', context)).toBe('HELLO WORLD');
      expect(Ao.eval('text.trim().substring(0, 5)', context)).toBe('hello');
    });
  });

  describe('5. Optional Chaining', () => {
    test('optional property access', () => {
      const context = {
        user: { name: 'Alice', profile: { age: 30 } },
        empty: null,
        missing: undefined
      };
      
      expect(Ao.eval('user?.name', context)).toBe('Alice');
      expect(Ao.eval('user?.profile?.age', context)).toBe(30);
      expect(Ao.eval('empty?.name', context)).toBe(undefined);
      expect(Ao.eval('missing?.profile?.age', context)).toBe(undefined);
    });

    test('optional method calls', () => {
      const context = {
        obj: {
          method: () => 'result',
          nested: { fn: () => 42 }
        },
        nullObj: null
      };
      
      expect(Ao.eval('obj?.method()', context)).toBe('result');
      expect(Ao.eval('obj?.nested?.fn()', context)).toBe(42);
      expect(Ao.eval('nullObj?.method()', context)).toBe(undefined);
      expect(Ao.eval('obj?.missing?.fn()', context)).toBe(undefined);
    });

    test('optional chaining with arrays', () => {
      const context = {
        data: { items: ['a', 'b', 'c'] },
        empty: {}
      };
      
      expect(Ao.eval('data?.items?.includes("b")', context)).toBe(true);
      expect(Ao.eval('empty?.items?.includes("b")', context)).toBe(undefined);
    });
  });

  describe('6. Complex Expressions', () => {
    test('nested expressions with multiple operators', () => {
      const context = {
        units: [
          { hp: 100, team: 'friendly' },
          { hp: 50, team: 'hostile' },
          { hp: 75, team: 'friendly' }
        ]
      };
      
      // Count friendly units with hp > 60
      const expr = 'units.filter(u => u.team == "friendly" && u.hp > 60).length';
      expect(Ao.eval(expr, context)).toBe(2);
    });

    test('conditional logic', () => {
      const context = {
        value: 10,
        threshold: 5
      };
      
      expect(Ao.eval('value > threshold && value < 20', context)).toBe(true);
      expect(Ao.eval('value < threshold || value > 20', context)).toBe(false);
    });

    test('mathematical expressions', () => {
      const context = { Math: Math };
      
      expect(Ao.eval('Math.sqrt(16)', context)).toBe(4);
      expect(Ao.eval('Math.pow(2, 3)', context)).toBe(8);
      expect(Ao.eval('Math.max(5, 10, 3)', context)).toBe(10);
      expect(Ao.eval('Math.floor(3.7)', context)).toBe(3);
    });
  });

  describe('7. Error Handling', () => {
    test('parse errors return undefined', () => {
      expect(Ao.eval('invalid syntax !@#')).toBe(undefined);
      expect(Ao.eval('(1 + 2')).toBe(undefined); // Unclosed paren
      expect(Ao.eval('1 ++ 2')).toBe(undefined); // Invalid operator
    });

    test('undefined variable access returns undefined', () => {
      expect(Ao.eval('nonExistentVar')).toBe(undefined);
      expect(Ao.eval('obj.missing.deep', {})).toBe(undefined);
    });

    test('invalid method calls return undefined', () => {
      const context = { value: 42 };
      expect(Ao.eval('value.notAMethod()', context)).toBe(undefined);
    });
  });

  describe('8. Real-World Game DSL Examples', () => {
    test('ability trigger conditions', () => {
      const context = {
        self: { hp: 30, maxHp: 100, pos: { x: 5, y: 5 } },
        closest: {
          enemy: () => ({ pos: { x: 8, y: 5 }, hp: 50 })
        },
        distance: (target: any) => {
          const dx = target.pos.x - context.self.pos.x;
          const dy = target.pos.y - context.self.pos.y;
          return Math.sqrt(dx * dx + dy * dy);
        }
      };
      
      // Check if health is below 50%
      expect(Ao.eval('self.hp < self.maxHp * 0.5', context)).toBe(true);
      
      // Check if enemy is within range
      expect(Ao.eval('distance(closest.enemy()) <= 5', context)).toBe(true);
      
      // Complex trigger condition
      const trigger = 'self.hp < 50 && closest.enemy() && distance(closest.enemy()) < 10';
      expect(Ao.eval(trigger, context)).toBe(true);
    });

    test('target selection', () => {
      const context = {
        units: [
          { id: 'u1', team: 'friendly', hp: 100 },
          { id: 'u2', team: 'hostile', hp: 50 },
          { id: 'u3', team: 'hostile', hp: 25 },
          { id: 'u4', team: 'friendly', hp: 75 }
        ]
      };
      
      // Find weakest enemy
      const weakestEnemy = 'units.filter(u => u.team == "hostile").sort((a, b) => a.hp - b.hp)[0]';
      const result = Ao.eval(weakestEnemy, context);
      expect(result?.id).toBe('u3');
      
      // Count enemies
      expect(Ao.eval('units.filter(u => u.team == "hostile").length', context)).toBe(2);
    });

    test('position calculations', () => {
      const context = {
        self: { pos: { x: 10, y: 10 } },
        target: { pos: { x: 15, y: 10 } },
        Math: Math
      };
      
      // Calculate distance
      const distExpr = 'Math.sqrt(Math.pow(target.pos.x - self.pos.x, 2) + Math.pow(target.pos.y - self.pos.y, 2))';
      expect(Ao.eval(distExpr, context)).toBe(5);
      
      // Check if in range
      expect(Ao.eval('Math.abs(target.pos.x - self.pos.x) <= 5', context)).toBe(true);
    });
  });

  describe('9. Performance Characteristics', () => {
    test('expression compilation is cached', () => {
      const ao = new Ao({ x: 42 });
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        ao.interpret('x + 1');
      }
      const elapsed = performance.now() - start;
      
      // Should be very fast due to internal caching
      expect(elapsed).toBeLessThan(100);
    });

    test('context creation is lightweight', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        new Ao({ value: i });
      }
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('10. Integration with DSL Compiler', () => {
    test('DSL expressions are valid Ao', () => {
      // All DSL expressions should be valid Ao syntax
      const dslExpressions = [
        'self.hp < 50',
        'closest.enemy()?.hp > 0',
        'distance(target) <= 5',
        'units.filter(u => u.team == "hostile").length > 3',
        'self.abilities?.includes("jump")',
        'Math.random() < 0.5'
      ];
      
      const context = {
        self: { hp: 30, abilities: ['jump'] },
        closest: { enemy: () => ({ hp: 100 }) },
        distance: () => 3,
        units: [],
        Math: Math
      };
      
      for (const expr of dslExpressions) {
        // Should not throw or return undefined for valid expressions
        const result = Ao.eval(expr, context);
        expect(result).not.toBe(undefined);
      }
    });
  });
});