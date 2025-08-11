# Review Points

1. The Core Simulator (src/simulator.ts)
This file is the heart of the simulation and is generally well-structured with its rule-based system. However, it has several significant issues:

Lack of Determinism: The frequent use of Math.random() for things like particle effects and knockback direction makes the simulation non-deterministic. This is the most critical issue, as it contradicts the design goals and makes testing and replays unreliable.
Buggy clone() Method: The clone() method performs a shallow copy of the units array. This means cloning a simulation state does not create a truly independent copy, and modifications to the clone will affect the original. This is a major bug.
Flawed Object Comparison: The delta() and objEq() helper methods for debugging do not correctly compare nested objects, leading them to report properties as "changed" on every tick, creating noisy and unhelpful debug output.
Redundant Code: The presence of two similar methods, addUnit and create, for adding units to the simulation is confusing and unnecessary.

2. Data Structures & Performance (src/sim/)
This area reveals a major insight into the project's architectural direction and its current state.

Well-Defined Types: The types.ts file provides clear and comprehensive data structures for units, abilities, and actions.
Abandoned Performance Refactor: The file double_buffer.ts is entirely commented out. It contains a well-thought-out, high-performance architecture using a Struct of Arrays (UnitArrays) and a SpatialHash for efficient collision detection. This is a huge red flag. It indicates the author was aware of the performance limitations of the current design but abandoned a major refactoring effort. The current simulation, which uses a simple array of objects, will not scale well to a large number of units.
3. Gameplay Logic (src/rules/)

The rules I inspected were in a very rough state, justifying the author's comments about not trusting them.

knockback.ts:
Inefficient: It uses a pairwise (O(n^2)) check, which is too slow for real-time physics.
Non-Deterministic: It uses Math.random() when units overlap.
Simplistic Physics: It manipulates unit positions directly instead of applying forces or changing velocity, which will lead to jerky movement and conflicts with other physics rules.
projectile_motion.ts:
Critically Flawed: The rule completely lacks collision detection. Projectiles will pass straight through their targets without effect.
Potential Memory Leaks: The logic for removing old projectiles is flawed and will fail to remove certain types, causing them to accumulate in memory forever.
Brittle Design: It relies on parsing a projectile's ID string to determine its owner, which is a fragile and error-prone method.
Conclusion

The TypeScript simulation layer is an ambitious and intellectually interesting project, but it is not in a stable or complete state. The core gameplay logic is lagging significantly behind the more advanced architectural concepts.

To move this project forward, I would recommend focusing on stabilizing the foundation before building more on top of it. This would involve:

Implementing a seeded random number generator to ensure determinism.
Fixing the critical bugs in clone() and delta().
Completing the core physics rules (ProjectileMotion and Knockback), including projectile collision detection.
Deciding whether to commit to the high-performance data-oriented architecture sketched out in double_buffer

===

- Settlement Phase
  - Command handler should immediately process all events triggered
  - But since these may trigger commands we may need to stay in a settlement cycle for some period of time
  - We could set a hard timer on this but need to be careful with that I think...

- Single Cell Lab
  - Test weather particles (leaves, snowflakes, raindrops)
  - Trigger cell effects (lightning, fire, explosion)

- Data-oriented Abilities
  - We need to parses abilities from file (and implement any new commands that imples)
  - We have sketched abilities.json already but would need to implement an alternate Abilities rule to test
  - We have migrated mostly over but could do creatures from JSON too!

- Font Atlas
  - **stenciled-16x16.png** - Already implemented for larger text
  - **teeny-4x4.png** - Minimal alphabet for space-constrained UI
  - Text rendering system for UI overlays and command feedback

- Legibility
  - Combat attack animation (Frame 3) should be transient / used only for 1-2 frames while damage is actually being dealt
  - Return to idle immediately afterward
  - We could also make use of Dead/Prone (Frame 4) for involtunary throw ('toss' command)

- UI Elements
  - Show unit name/type on mouse hover
  - Visual feedback showing what you've typed (requires font atlas)
  - Visual icons for grappled, frozen, etc.

- Performance
  - Double-buffer the world more cleanly/directly
  - Move to struct-of-arrays instead of array-of-struct
  - Filter only deltas to renderer
  - Coalesce 'pairwise intents'
  - Move bg to own canvas and try to draw exactly once when needed

- Simulation
  - Scalar fields for temperature, pressure, humidity
    - People catch fire at high temp, freeze at low temp

- MWEs
  - Soundbed
    - Tiny synthtoy
    - 4-track synth
      - chorus
      - pluck/bass
      - soloist
      - foley/chitter/birdsong
  - Title/Menuing system
    - Use renderer + font atlas to display navigable menus
  - Creature Encyclopedia
    - Facing left/right
    - Creature prefers climate zone/background
    - Zoom in on creature
    - Show abilities
    - Run arena sim
  - Background & Weather
    - Isolate and stack weather effects
    - Legible particle interactions with cells
  - Battle Sim
    - Legible particle interactions with cells
  - Scene Loader
    - Legible particle interactions with cells

- Animation Polish
  - Mechatron airdrop animation (Atmospheric entry, landing impact particles)
  - Segmented creatures
  - Grappling hook physics - Kinematic tension
  - Combat
    - More clear combat mechanics -- go into attack phase with lifecycle, warmup, hit state, recover
    - _only_ show combat attack (frame 3) when actually dealing damage; could set a tempvar but better if the renderer can identify 'this happened in the last turn, i should display attack frame'
    - Make better/any use of frame 4 (stun/prone) at least for involuntary throw
  - Thought/speech bubbles to display current logic?

- Technical Architecture
  - Would be nice to organize the specs -- at least isolate true e2es from tests that can run at sim layer entirely?
  - More generalization of commands -- ideally the whole sim is driveable through commands?
  - Could surface command strings in the sim as we're inputting them somehow
  - More backgrounds... maybe more procedurality within the backgrounds

