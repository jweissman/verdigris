import { describe, expect, it } from 'bun:test';
import { dslCompiler } from '../../src/dmg/dsl_compiler';

describe('DSL Compilation Inspection', () => {
  it('should show compiled output', () => {
    // Simple expression
    const expr1 = 'self.hp < 50';
    const fn1 = dslCompiler.compile(expr1);
    console.log('Expression:', expr1);
    console.log('Function:', fn1.toString().substring(0, 200));
    
    // Complex expression  
    const expr2 = 'distance(closest.enemy()) <= 3';
    const fn2 = dslCompiler.compile(expr2);
    console.log('\nExpression:', expr2);
    console.log('Function:', fn2.toString().substring(0, 500));
    
    expect(true).toBe(true);
  });
});