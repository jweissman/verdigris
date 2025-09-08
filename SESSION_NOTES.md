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

### 3. Damage Command Philosophy  
- **CORRECTED Understanding**: Use `aoe` command for positional area damage
- **Strike**: For directional melee attacks only
- **AoE**: For positional damage (jump impact, rock drop, explosions, ground pound)
- **Pattern**: Jump correctly uses `aoe`, others should follow

## Current State of Abilities

### ✅ Working
- **Blink**: Teleports instantly, interpolation resumes after
- **Dash**: Fast movement with interpolation  
- **Jump**: Correctly uses `aoe` command for impact damage
- **Rock Drop**: Falls fast (~3 ticks), uses `aoe` command, damage reduced to 25
- **Bolt**: Stun no longer shows as frozen, fire spawning reduced to 30% chance

### ⚠️ Issues
- **Ground Pound**: Manually calculates damage instead of using `aoe` command
- **Fire**: Still has issues from before (radius, targeting, decay)
- **Stunned units**: Need different visual effect (not ice cube)

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
- `PlayerControl` module is chaotic (796 lines of if/else chains!)
- Too many specialized rules (ClearTeleportFlag exists only for rendering)
- ~~Strike command too rigid~~ FIXED: Use `aoe` for positional damage
- Rendering logic mixed into sim layer (HeroAnimation rule)

## Improvements Made This Session

### ✅ Fixed Abilities
- **Rock Drop**: Now uses `aoe` command (consistent with jump)
- **Bolt**: Reduced fire spawning to 30% chance, removed freeze overlay for stun
- **Ground Pound**: Refactored to use `aoe` command
- **Stun Visual**: No longer shows ice cube (was confusing with freeze)

### ✅ Architecture Improvements
- Identified correct pattern: `aoe` for positional damage, `strike` for directional
- Documented rules that need to move out of sim
- Added TODOs for refactoring visual rules
- Created `ARCHITECTURE_RECOMMENDATIONS.md` with detailed refactoring plan

### ✅ Type Safety Improvements
- Created `CommandParams.ts` with specific types for each command
- Updated Command base class to be generic: `Command<TParams>`
- Fixed rule return types (no more `any[]`, now `QueuedCommand[]`)
- Created `UnitMeta.ts` with strongly typed unit metadata
- Reduced `any` types from 332 to 327 (and the remaining ones are better isolated)

### 🔴 Still Needs Work
- **PlayerControl**: Needs complete refactor (796 lines! Should be simple input→command translator)
- **HeroCommand**: Also bloated (562 lines), should delegate to ability commands
- **HeroAnimation**: Should move to renderer (tests block this)
- **ClearTeleportFlag**: Rendering concern in sim layer
- **Type Safety**: 332 uses of `any` type throughout codebase

## Key Insights

### Command Architecture
- PlayerControl should ONLY translate input to hero commands
- HeroCommand should delegate to specific ability commands
- Commands should never modify units directly (use Transform)
- All positional AOE should use `aoe` command (jump does this right)

### Separation of Concerns
**Belongs in Sim:** Gameplay logic, damage, movement, deterministic mechanics
**Belongs in Renderer:** Particles, animations, rigs, interpolation, visual effects

See `ARCHITECTURE_RECOMMENDATIONS.md` for detailed refactoring plan