import { describe, expect, it } from 'bun:test';
import { dslCompiler } from '../../src/dmg/dsl_compiler';

describe('DSL Optional Chaining', () => {
  it('should handle closest.enemy()?.pos', () => {
    const unit = {
      id: 'test',
      pos: { x: 0, y: 0 },
      team: 'friendly',
      hp: 100,
      state: 'idle'
    };
    
    const enemy = {
      id: 'enemy',
      pos: { x: 5, y: 0 },
      team: 'hostile',
      hp: 50,
      state: 'idle'
    };
    
    const context = {
      cachedUnits: [unit, enemy],
      getAllUnits: () => [unit, enemy],
      getRandom: () => 0.5
    };
    
    const expr = 'closest.enemy()?.pos';
    const fn = dslCompiler.compile(expr);
    const result = fn(unit as any, context as any);
    
    expect(result).toEqual({ x: 5, y: 0 });
  });
  
  it('should handle distance(closest.enemy()?.pos) <= 1', () => {
    const unit = {
      id: 'test',
      pos: { x: 0, y: 0 },
      team: 'friendly',
      hp: 100,
      state: 'idle'
    };
    
    const enemy = {
      id: 'enemy',
      pos: { x: 1, y: 0 },
      team: 'hostile',
      hp: 50,
      state: 'idle'
    };
    
    const context = {
      cachedUnits: [unit, enemy],
      getAllUnits: () => [unit, enemy],
      getRandom: () => 0.5
    };
    
    const expr = 'distance(closest.enemy()?.pos) <= 1';
    const fn = dslCompiler.compile(expr);
    const result = fn(unit as any, context as any);
    
    expect(result).toBe(true);
  });
});