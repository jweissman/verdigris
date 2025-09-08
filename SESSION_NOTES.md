# Session Notes - Verdigris Development

## Key Learnings

### 1. Interpolation System
- **Problem**: Blink (teleport) was breaking all interpolation permanently
- **Root Cause**: `ClearTeleportFlag` rule was using `delete` but Transform requires `undefined` to remove properties
- **Solution**: Set `teleported: undefined` explicitly in meta updates
- **Additional Fix**: View must track z-axis changes for falling objects (`prevPos.z !== currentZ`)

### 2. Architecture Issues
- **Core Problem**: Sim has accumulated rendering-specific rules
- **Design Intent**: Sim should be headless, deterministic, fast (per design-bible.md)
- **Bad Rules in Sim**:
  - `HeroAnimation` - purely visual
  - `FireTrail` - visual effect
  - `ClearTeleportFlag` - exists only to fix rendering issue
- **Why It Matters**: Need to run 30C4 synergy tests efficiently

### 3. Strike Command Philosophy
- **Key Principle**: ALL damage should go through strike command for consistent AOE visualization
- **Current Problem**: Strike expects direction-based patterns, not positional AOE
- **Need**: Strike command variant that handles centered AOE (for rock drop, explosions)

## Current State of Abilities

### ✅ Working
- **Blink**: Teleports instantly, interpolation resumes after
- **Dash**: Fast movement with interpolation
- **Rock Drop**: Falls in ~3 ticks, deals AOE damage

### ⚠️ Issues
- **Rock Drop**: 
  - Damage too high (40-50 is excessive)
  - Not using strike command (missing AOE visualization)
  - Should show clear impact zone
- **Fire**:
  - Radius too large
  - Doesn't target enemies well
  - Should decay over time (scalar fields?)
  - Burning creatures need flame overlay

## Design Philosophy Reminders (from docs)

1. **Constraints as Creativity**: 320x200, 2-color palette, deterministic sim
2. **Procedural but Artisanal**: Generated content guided by human curation
3. **Juice & Clarity**: Effects should communicate but not obscure
4. **Living Documentation**: Test-first, MWEs validate systems

## Next Steps

### Immediate
1. Make strike command handle positional AOE
2. Reduce rock damage to ~20-25
3. Ensure AOE zones render properly

### Architecture 
1. Create separate renderer rulebook
2. Move visual rules out of sim
3. Ensure sim can run headless for batch testing

### Abilities Audit
- Fire: Reduce radius from current to ~2-3
- Fire: Implement decay using scalar fields
- All damage: Route through strike for visualization
- Burning: Add flame sprite overlay

## Performance Notes
- Current: 991 tests in ~4s (excellent!)
- Goal: Maintain this while adding features
- Key: Keep sim lean, deterministic, headless

## Code Smells to Address
- `PlayerControl` module is chaotic
- Too many specialized rules (ClearTeleportFlag)
- Strike command too rigid for varied AOE patterns
- Rendering logic mixed into sim layer