# Performance Analysis

## Current State (0.1044ms total, 4.4% over relaxed budget)

| Rule                    | Median (ms) | % of 0.01ms | % of Total | Status |
|------------------------|-------------|-------------|------------|---------|
| Abilities              | 0.0603      | 603%        | 57.8%      | ❌ Critical |
| SegmentedCreatures     | 0.0092      | 92%         | 8.8%       | ⚠️ Near budget |
| MeleeCombat            | 0.0062      | 62%         | 5.9%       | ✅ |
| Knockback              | 0.0052      | 52%         | 5.0%       | ✅ |
| GrapplingPhysics       | 0.0041      | 41%         | 3.9%       | ✅ |
| HugeUnits              | 0.0036      | 36%         | 3.4%       | ✅ |
| Others (14 rules)      | 0.0158      | -           | 15.1%      | ✅ |
| **TOTAL**              | **0.1044**  | **1044%**   | **100%**   | **104% of 0.1ms** |

## Key Issues

### 1. Abilities Rule (57.8% of total time)
- Creates ~19 proxy objects per tick (getAllUnits called once)
- DSL evaluation for triggers and conditions
- Processing area_buff effects
- Main bottlenecks:
  - Proxy creation: ~30% of rule time
  - DSL evaluation: ~40% of rule time  
  - Effect processing: ~30% of rule time

### 2. SegmentedCreatures (8.8% of total time)
- Still creating some proxies
- Could be vectorized

## Optimization Strategy

### Phase 1: Abilities Rule Array-Based Processing (Target: -0.040ms)
1. Convert to direct array access like MeleeCombat/Knockback
2. Cache DSL compilation (not evaluation results)
3. Batch effect processing
4. Expected savings: 60-70% reduction (0.0603 → ~0.020ms)

### Phase 2: DSL Optimization (Target: -0.010ms)
1. Pre-compile DSL expressions at startup
2. Use simpler evaluation for common patterns
3. Avoid object allocation in evaluator
4. Expected savings: 50% of DSL overhead

### Phase 3: SegmentedCreatures Vectorization (Target: -0.005ms)
1. Convert to array-based processing
2. Expected savings: 50% reduction (0.0092 → ~0.005ms)

## Expected Final Performance
- Current: 0.1044ms
- After Phase 1: ~0.064ms (36% reduction)
- After Phase 2: ~0.054ms (48% reduction)
- After Phase 3: ~0.049ms (53% reduction, **51% under budget**)

## Next Steps
1. Profile exact DSL evaluation overhead
2. Implement array-based Abilities rule
3. Create DSL compilation cache
4. Measure and iterate