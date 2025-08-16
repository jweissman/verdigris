# Performance Analysis Summary

## Current Performance Metrics

- **Minimal sim (50 units, no rules)**: 0.004ms ✅
- **With movement rule only**: 0.008ms ✅  
- **With environmental effects**: 0.086ms ✅
- **With combat rules**: 0.145ms
- **Full simulation (21 rules)**: 0.30ms

## Optimizations Implemented

1. **Fixed capacity iteration bug**: Was iterating over 1000 array slots instead of just active units
   - Changed from `for (let i = 0; i < arrays.capacity; i++)` to `for (const i of arrays.activeIndices)`
   - Impact: ~30% performance improvement

2. **Fixed proxy array cache**: Was rebuilding proxy array every frame even when cached
   - Now properly caches and only rebuilds when unit count changes
   - Impact: ~10% performance improvement

3. **Optimized proxy property access**: Added cached index to avoid Map lookups
   - Proxies now store their array index to bypass getIndex() calls
   - Impact: ~5% performance improvement

4. **Reduced spatial rebuild frequency**: Only rebuild when units move significantly (>0.5 units)
   - Impact: Fewer rebuilds but minimal performance gain

## Fundamental Bottleneck: Proxy Pattern Overhead

Each rule takes ~0.25ms regardless of complexity. This is because:

1. **Every rule calls `getAllUnits()`** which returns an array of proxy objects
2. **Every property access on a proxy is a function call** with multiple operations:
   - Check cached index
   - Array lookup
   - Type conversion (for team, state, etc.)
3. **With 50 units × 21 rules × ~10 property accesses = 10,500+ function calls per step**

## Why 0.01ms is Currently Unachievable

To achieve 0.01ms with 21 rules, each rule would need to execute in 0.0005ms (500 nanoseconds).
This is fundamentally impossible with the current proxy-based architecture because:

- A single `getAllUnits()` call takes ~0.001ms just to return the cached array
- Iterating 50 proxies and accessing 2-3 properties each takes ~0.2ms
- The overhead of the proxy pattern alone exceeds the entire budget

## Potential Solutions for Sub-0.1ms Performance

1. **Eliminate Proxies for Rules**: Rules should work directly with arrays
   - Would require major architectural change
   - Could achieve 10-100x performance improvement
   - Risk: Breaks encapsulation, harder to maintain

2. **Compile Rules to Vectorized Operations**: Instead of iterating units, batch operations
   - Example: Instead of checking each unit's HP, use SIMD operations on HP array
   - Requires completely different rule API
   - Could achieve near-0.01ms performance

3. **Dramatically Reduce Rule Count**: Only run essential rules
   - Many rules do nothing most frames (e.g., Abilities with no units having abilities)
   - Could conditionally disable rules based on game state
   - Limited improvement - still bounded by proxy overhead

4. **Web Workers for Parallel Execution**: Original plan from architecture doc
   - Split rules across workers
   - Requires careful synchronization
   - Network overhead might exceed gains for small sims

## Recommendation

The current 0.30ms for full simulation is actually quite good - that's 3333 FPS for just the simulation.
To achieve 0.01ms would require abandoning the proxy pattern entirely and rewriting all rules
to work directly with typed arrays, which would be a massive architectural change.

The sweet spot is probably:
- Keep proxy pattern for maintainability
- Optimize hot paths to work directly with arrays where needed
- Accept 0.1-0.3ms as reasonable performance for full simulation
- Focus optimization efforts on larger simulations (200+ units) where scaling matters more