# Architecture Review - Current State

## Progress Against Architecture Critique

### 1. SoA/UnitProxy Refactoring ✅ PARTIALLY ADDRESSED
**Original Issue**: UnitProxy and Unit types incompatible, multiple sources of truth

**Current State**:
- ✅ Direct array access in hot paths (MeleeCombat now uses arrays directly)
- ✅ getArrays() properly typed with all fields (hp, dmg, maxHp, mass)
- ❌ Still have proxy/arrays duality (not fully committed to one approach)
- ❌ Cold data still exists as separate Map

**Recommendation Status**: 
- We successfully bypass proxies in MeleeCombat (6.7x speedup!)
- But haven't fully committed to arrays-only approach

### 2. Rule Engine API ⚠️ PARTIALLY ADDRESSED
**Original Issue**: Rules get full Simulator access, breaking encapsulation

**Current State**:
- ✅ TickContext exists and is used
- ❌ Rules still access sim internals via `(context as any).sim`
- ❌ TickContext doesn't fully hide implementation details

**Recommendation Status**:
- TickContext was created but rules still break through it
- Need to strengthen the API boundary

### 3. Data Definitions and Magic Strings ✅ MOSTLY ADDRESSED
**Original Issue**: Magic strings, inconsistent object shapes

**Current State**:
- ✅ Fixed team encoding consistency
- ✅ Fixed AbilityEffect type errors
- ✅ Strong typing for unit states and teams
- ⚠️ Still using meta bag for some properties

**Recommendation Status**:
- Type safety much improved (79 → 61 type errors)
- Meta bag still needs replacement with proper components

### 4. Performance Hot Paths ✅ SUCCESSFULLY OPTIMIZED
**Original Issue**: Proxy overhead, O(n²) algorithms

**Current State**:
- ✅ MeleeCombat: 0.0937ms → 0.0139ms (6.7x improvement!)
- ✅ Proper O(n(n-1)/2) pairwise checking implemented
- ✅ Direct array access in combat rules
- ❌ PairwiseBatcher exists but disabled

## Current Bottlenecks Analysis

### Top Performance Issues (% of 0.001ms budget):
1. **RangedCombat (1854%)** - Still using proxy path?
2. **MeleeCombat (1393%)** - Optimized but still expensive
3. **Knockback (1282%)** - Physics calculations
4. **SegmentedCreatures (389%)** - Complex multi-unit logic

### Why Combat is Expensive (but acceptable):
- **Correct O(n²/2) complexity**: With 50 units, checking ~1225 pairs
- **Multiple checks per pair**: distance, team, state, tags
- **Command generation**: 3 commands per hit (halt, meta, damage)

## Remaining Architecture Issues

### 1. Meta Command Anti-Pattern
```typescript
// Current (bad):
{ type: "meta", params: { unitId, meta: { lastAttacked: tick }, state: "attack" }}

// Should be:
arrays.lastAttackTick[idx] = tick;
arrays.state[idx] = 2; // attack
```

### 2. Disabled PairwiseBatcher
```typescript
// In simulator.ts:
if (false && this.pairwiseBatcher) { // DISABLED!
  this.pairwiseBatcher.process(this.units as Unit[], this);
}
```

### 3. Cold Data Dependencies
- abilities[] still in cold data
- tags[] still in cold data  
- meta object sprawl

## Recommendations for Landing the Plane

### Immediate Fixes (High Impact, Low Risk):
1. **Enable PairwiseBatcher** - It's already there!
2. **Optimize RangedCombat** - Apply same array techniques as MeleeCombat
3. **Batch hit commands** - Reduce 3n commands to 1

### Medium-term Fixes (Moderate Impact, Some Risk):
1. **Move combat state to arrays**: lastAttackTick, attackCooldown
2. **Move abilities to bit flags**: Instead of string[], use bitmask
3. **Eliminate meta command**: Direct array writes

### Architecture Score: B-
- **Strengths**: Performance improved 6.7x, type safety better
- **Weaknesses**: Incomplete refactoring, disabled optimizations
- **Risk**: Technical debt from half-finished transitions

## Code Quality Assessment

### Good Patterns Found:
```typescript
// Proper pairwise iteration (avoiding duplicates)
for (let i = 0; i < count; i++) {
  for (let j = i + 1; j < count; j++) {
    // Process pair once
  }
}
```

### Anti-patterns Still Present:
```typescript
// Breaking through abstraction
const arrays = (context as any).sim?.unitArrays;
const coldData = (context as any).sim?.unitColdData;
```

## Path Forward for Production

1. **Enable what's already built** (PairwiseBatcher)
2. **Apply proven optimizations** (array access to RangedCombat)  
3. **Batch commands** to reduce overhead
4. **Move to pure ECS** gradually (one component at a time)
5. **Test with 35 creatures** systematically

The architecture is "good enough" for content production with these fixes.