# Next Steps Summary

## Completed Today
✅ Fixed druid/naturalist integration test
✅ Added miner and mindmender units with tests
✅ Fixed TypeScript errors (down to iterator issues)
✅ Analyzed double-buffering architecture
✅ Implemented terrain modification for defensive trenches

## High Priority Tasks

### 1. Performance Improvements (Critical)
The double-buffering implementation exists but is commented out. This should be priority #1:
- **Phase 1**: Implement double buffering for units (25% performance gain)
- **Phase 2**: Add dirty tracking to minimize renders
- **Phase 3**: Consider struct-of-arrays migration for massive performance gains

### 2. Centralize Unit Rendering
Currently units are rendered in multiple places:
- `orthographic.ts`
- `isometric.ts`  
- `cinematic.ts`

This causes drift when unit structure changes. Solution: Create a single `UnitRenderer` class.

### 3. Fix/Remove Skipped Tests (16 tests)
These fall into categories:
- **Rope Climbing** (6 tests) - Feature not implemented
- **Lightning Storm** (1 test) - System exists but not integrated
- **Construct Behavior** (2 tests) - AI needs work
- **Projectile Arcing** (1 test) - Physics incomplete
- **Complex Scenarios** (6 tests) - May need simplification

## Medium Priority

### 4. Handle Unknown Event Types
The logs show "Unknown event kind: terrain" - need to add terrain event handling to EventHandler.

### 5. TypeScript Configuration
Iterator errors suggest target/lib mismatch. Already have downlevelIteration enabled.

## Recommendations

1. **Start with double-buffering** - It's already designed, just needs uncommenting and integration
2. **Centralize rendering immediately** - Prevents future bugs
3. **Review skipped tests systematically** - Either implement features or remove tests
4. **Add terrain event handling** - Complete the trench system

The performance improvements are most critical as the current O(n²) collision detection and direct mutation patterns will not scale beyond ~100 units.