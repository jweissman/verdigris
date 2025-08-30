# Render/Update Coupling Analysis

## Current Flow

1. **Game Loop** (`game.ts:355-358`)
   - `loop()` calls `update()` then requests next animation frame
   - This runs at 60fps (or browser refresh rate)

2. **Update Method** (`game.ts:361-378`)
   - Checks if enough time passed for sim tick (100ms at 10Hz)
   - If yes: stores positions, steps sim, updates lastSimTime
   - ALWAYS calculates interpolation factor (0-1 based on time since last sim)
   - ALWAYS calls drawFrame()

3. **Interpolation** 
   - Factor is calculated: `timeSinceLastSim / simTickInterval`
   - Stored in `sim.interpolationFactor`
   - Used in `isometric.ts:257-261` to lerp unit positions

## The Problem

The interpolation SHOULD work, but there are issues:

1. **Particles aren't interpolated** - They're created/destroyed by sim ticks
2. **Cell effects aren't interpolated** - They're binary on/off states
3. **Visual effects tied to sim state** - Fire/freeze effects only update on sim tick

## Why It Looks Choppy at 10Hz

Even though unit POSITIONS interpolate, everything else snaps:
- Particles appear/disappear instantly
- Cell effects change instantly  
- Damage numbers/effects appear on sim tick
- State changes (frozen/burning) are instant

## The Cell Effects Bottom Row Bug

Looking at `isometric.ts:722-736`, cell effects are rendered but I need to see HOW they determine which cells to render...

## Fire Not Applying Overlays

The flame overlay check (`unit_renderer.ts:226-235`) looks for `unit.meta?.onFire || unit.meta?.burning` but fire command may not be setting these flags properly.

## Next Steps

1. Check how cell effects determine which cells to render
2. Verify fire command sets burning flags on units
3. Consider decoupling visual effects from sim state