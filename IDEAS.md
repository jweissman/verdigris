# Ideas & Future Improvements 💡

## Textual Interface Layer 📝

### Font Systems
- **stenciled-16x16.png** - Already implemented for larger text
- **teeny-4x4.png** - Minimal alphabet for space-constrained UI
- Text rendering system for UI overlays and command feedback

### UI Elements
- **Unit name hover** - Show unit name/type on mouse hover
- **Command entry buffer** - Visual feedback showing what you've typed
- **Health bars** - Numerical or bar representation over units
- **Status indicators** - Visual icons for grappled, frozen, etc.

## Visual Enhancements 🎨

### Background & Weather MWE
- **Background picker** - Arrow key navigation through different scenes
- **Weather selector** - Toggle between clear/rain/winter/storm
- **Isolated weather effects** - See how particles render in different conditions
- **Iso field layout tester** - Compare different isometric projection settings

### Animation Improvements
- **Leaf animation fixes** - Natural movement and rotation
- **Mechatron airdrop animation** - Atmospheric entry, landing impact particles
- **Segmented creature animation** - Smooth snake-like undulation
- **Grappling hook physics** - Realistic rope sag and tension

### Rendering Polish
- **Shadow system** - Proper shadows based on light sources
- **Depth sorting** - Ensure correct layering in isometric view
- **Sprite frame timing** - Smooth animation cycles
- **Particle optimization** - Efficient rendering for many particles

## Gameplay Systems 🎮

### Desert Day Features (Completed ✅)
- ✅ Big segmented megaworm (12 segments)
- ✅ Grappler folk with kinematic hooks
- ✅ Taut rope physics and pinning
- ✅ Desert heat shimmer effects
- ✅ Comprehensive creature encyclopedia

### Mechanist Support (Completed ✅)
- ✅ All 9 mechanist unit tests passing
- ✅ Builder, Fueler, Mechanic, Engineer, Welder, Assembler abilities
- ✅ Synergy between mechanists and constructs
- ✅ Power surge, shield generation, system hacking

### Combat & AI
- **Formation system** - Units maintain tactical positioning
- **Advanced AI** - Context-aware ability usage
- **Combo abilities** - Chain different unit abilities together
- **Terrain effects** - Environmental modifiers to combat

## Development Tools 🛠️

### MWE Collection
- ✅ **Creature Encyclopedia** - Browse and inspect all 33 creatures
- ✅ **Sprite Showcase** - Visual testing for rendering edge cases
- **Background/Weather Selector** - Environmental effect tester
- **Combat Simulator** - Test balance and interactions
- **Performance Profiler** - Optimize particle systems and rendering

### Testing Infrastructure
- **Visual regression tests** - Ensure rendering consistency
- **Performance benchmarks** - Track frame rates and memory usage
- **Integration scenarios** - Complex multi-system interactions
- **Randomness control** - Centralized RNG for deterministic testing

## Code Architecture 🏗️

### Rendering Pipeline
- **Modular renderers** - Separate grid/isometric/orthographic
- **Layer system** - Background, terrain, units, effects, UI
- **Viewport management** - Camera controls and zooming
- **Responsive layout** - Adapt to different screen sizes

### State Management
- **Command queue system** - Better input handling
- **Game state serialization** - Save/load functionality
- **Replay system** - Record and playback battles
- **Network multiplayer** - Client/server architecture

### Performance
- **Entity-Component-System** - More flexible unit composition
- **Spatial partitioning** - Efficient collision detection
- **Memory pooling** - Reduce garbage collection overhead
- **WebGL rendering** - Hardware-accelerated graphics

## Creative Content 🎭

### New Creature Types
- **Aerial units** - Flying creatures with altitude mechanics
- **Aquatic units** - Water-based creatures with swimming
- **Hybrid creatures** - Units that transform or evolve
- **Environmental spawners** - Units that create terrain features

### Weather & Environment
- **Dynamic weather** - Weather changes affect gameplay
- **Day/night cycle** - Time-based unit behavior changes
- **Seasonal effects** - Long-term environmental changes
- **Destructible terrain** - Battle affects the landscape

### Special Scenarios
- **Boss battles** - Unique large-scale encounters
- **Survival modes** - Endless waves of enemies
- **Puzzle scenarios** - Use unit abilities to solve challenges
- **Campaign mode** - Linked battles with story progression

## Quality of Life 🌟

### Accessibility
- **Colorblind support** - Alternative visual indicators
- **Keyboard shortcuts** - Full keyboard navigation
- **Screen reader support** - Text descriptions for visual elements
- **Customizable UI** - User-adjustable interface elements

### User Experience
- **Tutorial system** - Interactive learning scenarios
- **Help tooltips** - Context-sensitive information
- **Undo/redo** - Ability to reverse actions
- **Quick reference** - Hotkey for unit ability summaries

---

## Original Ideas from Development

### Combat & Animation Polish
- More clear combat mechanics -- go into attack phase with lifecycle, warmup, hit state, recover
- _only_ show combat attack (frame 3) when actually dealing damage; could set a tempvar but better if the renderer can identify 'this happened in the last turn, i should display attack frame'
- Make better/any use of frame 4 (stun/prone) at least for involuntary throw
- Thought/speech bubbles to display current logic?

### Technical Architecture
- Would be nice to organize the specs -- at least isolate true e2es from tests that can run at sim layer entirely?
- More generalization of commands -- ideally the whole sim is driveable through commands?
- Could surface command strings in the sim as we're inputting them somehow
- More backgrounds... maybe more procedurality within the backgrounds

---

## Implementation Priority 📋

### High Priority (Next Sprint)
1. **Background/Weather MWE** - Visual testing tool
2. **Mechatron airdrop polish** - Improve landing animation
3. **Unit hover tooltips** - Basic name display

### Medium Priority
1. **Command buffer display** - Show typed commands
2. **Leaf animation fix** - Natural movement
3. **Formation system** - Basic tactical positioning

### Low Priority (Future Iterations)
1. **Network multiplayer** - Client/server foundation
2. **Campaign mode** - Story-driven scenarios
3. **Advanced AI** - Context-aware decision making

---

*This file serves as a living document for collecting ideas and planning future development. Items move from ideas to todos to implementation as priorities are established.*
