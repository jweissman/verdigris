- Single Cell Lab
  - Test weather particles (leaves, snowflakes, raindrops)
  - Trigger cell effects (lightning, fire, explosion)

- Data-oriented Abilities
  - We need to parses abilities from file (and implement any new commands that imples)
  - We have sketched abilities.json already but would need to implement an alternate Abilities rule to test

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

