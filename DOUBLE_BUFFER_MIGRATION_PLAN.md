# Double-Buffering Migration Plan

## Current State Analysis

### Rules That Mutate Units (10 total)
1. **Map-based mutations (7)**: Return new array with modified units
   - UnitMovement, UnitBehavior, Abilities, Jumping, Tossing, StatusEffects, AreaOfEffect
   
2. **Filter-based (1)**: Remove units
   - Cleanup (removes dead units)
   
3. **Direct push/filter (2)**: Add/remove phantom units
   - HugeUnits, SegmentedCreatures

### The Sequential Dependency Problem
Rules are NOT independent. They form a pipeline:
```
UnitMovement -> sets positions
  ↓
MeleeCombat -> uses NEW positions for collision
  ↓  
Knockback -> modifies positions AGAIN
  ↓
Cleanup -> removes dead units
```

Changing this to pure double-buffering would alter game behavior!

## Realistic Migration Options

### Option 1: Mutation Command Pattern (Recommended)
**Effort**: Medium (2-3 hours)
**Risk**: Low
**Benefit**: Moderate

1. Create MutationCollector class
2. Change rules to emit mutations instead of direct changes
3. Apply mutations after each rule (preserving order)
4. Eventually batch mutations for performance

```typescript
class MutationCollector {
  mutations: UnitMutation[] = [];
  
  updateUnit(id: string, changes: Partial<Unit>) { ... }
  removeUnit(id: string) { ... }
  addUnit(unit: Unit) { ... }
  
  applyTo(units: Unit[]): Unit[] { ... }
}
```

### Option 2: Selective Double-Buffering
**Effort**: Low (1 hour)  
**Risk**: Medium (could introduce bugs)
**Benefit**: Low-Moderate

Only double-buffer rules that are truly independent:
- Buffer: UnitMovement, UnitBehavior (position updates)
- Direct: MeleeCombat, Knockback (need immediate position data)

### Option 3: Full SoA Integration  
**Effort**: High (4-6 hours)
**Risk**: High (massive refactor)
**Benefit**: High (2-5x performance)

1. Replace Unit[] with UnitArrays everywhere
2. Rewrite ALL rules to work with arrays
3. Use UnitProxy only at boundaries
4. This is a complete rewrite!

### Option 4: Just Move Creatures to JSON
**Effort**: Low (30 min)
**Risk**: None
**Benefit**: Code organization

This doesn't help performance but improves maintainability.

## Recommendation

**Start with Option 4 (JSON) + measure real bottlenecks**

Current performance is actually decent:
- 50 units: 1.5ms (650+ fps)  
- 200 units: 5.4ms (180+ fps)

For 60fps target, we have 16ms budget:
- 5ms simulation
- 11ms for rendering (plenty!)

**The real question**: Is the complexity worth it?

## If We Must Do Double-Buffering

Here's the safest approach:

### Phase 1: Mutation Collector (1 hour)
1. Create MutationCollector
2. Add to Simulator
3. Test with ONE rule (UnitMovement)
4. Verify tests still pass

### Phase 2: Migrate Rules (2 hours)
5. Migrate rules one by one
6. Run tests after each migration
7. Keep old path as fallback

### Phase 3: Optimize (1 hour)
8. Batch mutations where possible
9. Add dirty tracking
10. Profile improvements

## The Hard Truth

Double-buffering in a system with sequential dependencies doesn't give you the full theoretical benefits. The wins would be:
- Cleaner mutation tracking (for networking/replay)
- Potential for parallelization (limited by dependencies)
- Better cache usage (marginal in JavaScript)

But the costs are:
- Complex migration
- Risk of introducing bugs
- More abstraction/indirection
- Potential performance LOSS from abstraction overhead

## My Recommendation

1. Move creatures to JSON (easy win)
2. Profile WHERE the actual time goes
3. Only optimize the real bottlenecks
4. Consider double-buffering only if we need deterministic replay or networking