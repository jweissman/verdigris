# Transform Isolation Approach

## Goal
Isolate all unit mutations to a Transform object that only CommandHandler can access.

## Current State
- Rules directly mutate: `this.sim.units = this.sim.units.map(...)`
- Every rule has mutation power
- No clear boundary between read and write

## Target State
```typescript
// Only CommandHandler gets this
class Transform {
  setUnits(units: Unit[]) { ... }
  mapUnits(fn: (u: Unit) => Unit) { ... }
  filterUnits(fn: (u: Unit) => boolean) { ... }
}

// Regular rules can only read
class UnitMovement extends Rule {
  apply() {
    // Can read units
    const moved = this.sim.units.map(u => ({ ...u, pos: ... }));
    
    // CANNOT write - no access to Transform
    // this.sim.units = moved; // ERROR!
    
    // Must return new state or queue commands
    return moved;
  }
}

// CommandHandler applies all mutations
class CommandHandler extends Rule {
  constructor(sim: Simulator, private tx: Transform) { ... }
  
  apply() {
    // Only this rule can mutate via Transform
    this.tx.mapUnits(u => ...);
  }
}
```

## Migration Path

### Step 1: Make units setter private ✅
- Done: `private _units` with getter/setter

### Step 2: Create Transform class ✅  
- Done: Created transform.ts with mutation methods

### Step 3: Give Transform only to CommandHandler
- TODO: Modify CommandHandler constructor
- TODO: Pass Transform when creating CommandHandler

### Step 4: Change rules to return new state
- TODO: Change Rule base class to support returning Unit[]
- TODO: Migrate each rule one by one

### Step 5: Apply returned state in simulator
- TODO: After each rule, apply its returned state via Transform

## Challenges

1. **Sequential Dependencies**: Rules depend on mutations from previous rules
   - Solution: Apply each rule's result immediately, maintaining order

2. **Side Effects**: Rules also create projectiles, queue events
   - Solution: Return a Result object with units + side effects
   
3. **Massive Refactor**: 10+ rules need changes
   - Solution: Support both patterns during migration

## Benefits

1. **Clear Mutation Boundary**: Only Transform can mutate
2. **Potential for Parallelization**: Rules become pure functions
3. **Easier Testing**: Rules return values instead of mutating
4. **Better for Networking/Replay**: Mutations are centralized

## Current Performance
- 50 units: 1.5ms per step (650 fps)
- 200 units: 5.4ms per step (180 fps)
- Already meeting 60fps target with room to spare

## Question
Is this refactor worth it given current performance is already good?