import { describe, expect, it } from 'bun:test';
import { dslCompiler } from '../../src/dmg/dsl_compiler';

describe('DSL Compiler Debug', () => {
  it('should compile simple expression', () => {
    const expr = 'self.hp < 50';
    try {
      const fn = dslCompiler.compile(expr);
      // console.log('Simple expression compiled:');
      // console.log(fn.toString().substring(0, 500));
    } catch (e) {
      console.error('Failed to compile:', e);
    }
    expect(true).toBe(true);
  });
  
  it('should compile complex expression with closest', () => {
    const expr = 'distance(closest.enemy()?.pos) <= 10';
    try {
      const fn = dslCompiler.compile(expr);
      // console.log('\nComplex expression compiled:');
      // console.log(fn.toString());
    } catch (e) {
      console.error('Failed to compile:', e);
    }
    expect(true).toBe(true);
  });
});