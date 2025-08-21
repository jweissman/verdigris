# Hero MWE - Testing Guide

## Overview
The Hero MWE demonstrates a controllable hero unit with jump mechanics, using the normal Verdigris simulator.

## Files
- `hero_simple.html` - Entry point (open in browser)
- `hero_game.ts` - Game runner that manages the simulator loop
- `hero_controller.ts` - Controller module that queues commands based on input

## How to Test

1. **Open the MWE:**
   ```
   Open src/mwe/hero_simple.html in your browser
   ```

2. **Controls:**
   - **WASD** - Move hero (queues move commands)
   - **Space** - Jump (queues jump command with height=5, distance=4)
   - **Q** - Ground Pound ability
   - **E** - Heroic Leap ability  
   - **R** - Reset simulator
   - **P** - Pause

3. **What to Observe:**

   **Jump Mechanics:**
   - Hero should jump in a parabolic arc
   - Jump takes ~4 steps to complete
   - Hero cannot jump while already jumping
   - Console shows detailed jump logging:
     - `[JUMP]` - Command queued
     - `[JUMP START]` - Jump began
     - `[JUMP PROGRESS]` - Height and position during jump
     - `[JUMP END]` - Landing position

   **Movement:**
   - Hero moves with WASD
   - Facing direction updates (left/right)
   - Hero stays within world bounds (30x20)

   **Background:**
   - Rooftop background loads from `src/assets/bg/rooftop.png`
   - Rendered through normal isometric view

## Architecture Notes

- Uses **real simulator** with proper command queuing
- Jump uses the `JumpCommand` from `src/commands/jump.ts`
- Jump physics handled by `src/rules/jumping.ts`
- No mocked HTML or custom rendering - everything through normal sim
- Commands queued to `sim.queuedCommands` array
- Simulator steps normally at 60fps

## Performance

Current performance (from tests):
- Average step time: ~1.7ms (target: 0.2ms per VISION.md)
- First few steps spike to 13ms (initialization)
- Memory usage: ~3MB for 50 units over 50 steps

## Known Issues

1. Jump distance slightly short (~12 tiles instead of 14) due to incremental position calculation
2. First frame performance spike needs optimization
3. Parallax layers not yet implemented

## Next Steps

- Add parallax layer splitting for rooftop (fg/mg/bg)
- Optimize first-frame performance
- Add more hero abilities
- Create Gauntlet MWE with background stitching