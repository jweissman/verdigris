// Debug DSL compiler directly
const { dslCompiler } = require('./src/dmg/dsl_compiler.ts');

// Test basic expressions
const testExpressions = [
  'distance(closest.enemy()?.pos) <= 2',
  'closest.enemy()',
  'closest.enemy()?.pos',
  'self.hp > 50',
  'true'
];

console.log('Testing DSL compiler...');

for (const expr of testExpressions) {
  try {
    console.log(`\nTesting: "${expr}"`);
    const compiled = dslCompiler.compile(expr);
    console.log('✓ Compiled successfully');
    
    // Test execution with dummy data
    const dummyUnit = {
      id: 'test',
      pos: { x: 0, y: 0 },
      hp: 100,
      team: 'friendly'
    };
    
    const dummyContext = {
      getAllUnits: () => [
        { id: 'enemy1', pos: { x: 1, y: 1 }, team: 'hostile', state: 'idle', hp: 50 }
      ]
    };
    
    const result = compiled(dummyUnit, dummyContext);
    console.log(`Result: ${result}`);
    
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
}