# Performance Foundation

Fix draw rate problem - Many 2v2 battles timeout at 500 steps without resolution
Diagnose combat fundamentals - Units may be too weak or creating stalemate conditions
Optimize 2v2 battle runner - Current hours-long execution prevents meaningful testing
Complete JSON export pipeline - Connect generation system to simulation

# IMMEDIATE PRIORITIES (Hero Day / Dragon Day)
## Hero System

Kinetic platformer feel - Triple jump, ground pound, dash mechanics at 16x16 or 24x24 scale
Hero movement commands - Integrate with existing command system
Basic card-based abilities - Hero draws and plays ability cards
Auto-targeting for spells - Smart defaults to reduce micro-management
Triple jump + ground pound mechanics - core kinematic hero movement
Hero minimal working example - first-person controllable character
Hero bursting through castle doors - opening cinematic sequence
Card hand/play system - hero draws abilities as cards
Hero autoplay mode - can operate autonomously like auto-battler

## Dragon Encounter

Segmented dragon creature - multi-part boss with individual segments
Lancer with steel pin + chain - specialized anti-dragon unit with winch mechanics
Kinematic rope/chain simulation - realistic grappling physics
Dragon Day set piece - climactic encounter at Necromancer Tower

# GAUNTLET STRUCTURE & ENVIRONMENTS
## Core Gauntlet Sequence

Castle gates → Piedmont hills → Forest → Mountain pass → Desert/Oasis → Coastal city → Classical ruins → Burning cities → Necromancer tower → Black crystal space

## Environment-Specific Features

Forest Day: Squirrel tamers, mega-squirrel riders, owl cult, meditative set pieces
Mountain Day: Dwarven sappers, mech mages, mining exosuits, Mechatron
Desert scenes: Nomad bedouins, sandworm trainers, grappling hooks
Coastal city: Rich architectural detail, nightclub/symphony hall, reflecting pools
Temple ruins: Classical columns, daggers of light, meditative atmosphere

## Visual & Technical

640x400 epic backgrounds - larger canvas for dramatic scenes
Parallax scrolling - multiple layers for depth
Double-wide battle strips - expanded tactical space
Cinematographic camera - dolly effects, screen shakes

# CREATURE & UNIT DESIGN
## Folk System (Base Units)

35+ creature archetypes expanding to 50+
Single-ability isotypes - each folk has one clear role
Evolutionary paths - folk → creatures → heroes
15+ distinct commands - modular ability system

## Specific Unit Requests

Tradecraft units - spies, thieves, alignment spoofing
Revolutionary - mass conversion/insanity effects
Siege mage - long-range anti-megabeast
Sphinx creature - tier 5 shaman, puzzle interactions
Porter mechs - dwarven logistics units
Flying sprites - birds, animated creatures

## Megabeast System

Faction-specific counters: Nomads pin & ride, Elves tame, Dwarves build Mechatron, White uses people-power
Kinematic interactions - mounting, grappling, complex physics

# AUDIO & ATMOSPHERE
## Music System

4-track synthesizer - chorus, pluck, distorted guitar, ambient
Chord inversions for chorus voices
Procedural music engine - mood-responsive scoring
Sound bank - combat effects, environmental audio
Mood super system - weather, particles, synth loops tied to emotional beats

## Visual Effects

30+ cell effects - frozen, burned, quicksand, water, blocks
Particle systems - fire, lightning, explosions
Animation improvements - tighter 2-4 frame cycles
Screen effects - independent of camera, retro console feel

# SIMULATION & ARCHITECTURE
## Performance Targets

0.1-0.2ms per sim tick - fast enough for real-time evaluation
Struct-of-arrays optimization - vectorized operations
Command-based rules - no direct mutation, clean simulation semantics
1000+ tests total across integrated system

## Integration Goals

Card generation ↔ Simulation - close the loop between world-gen and sim
Synergy detection - 1v1, 2v2 automated analysis
House composition - meta-engine evaluation
Black Crystal analytics - dev tools disguised as game mechanic

# UI & INTERACTION
## Interface Elements

Font atlas - embedded text rendering
Hover system - unit inspection, tooltips
Menu/title screens - proper game presentation
Scene browser - background/environment viewer
Creature encyclopedia - unit database with spinning holograms

## Gameplay Mechanics

No visible quantification - health bars minimal, focus on visual feedback
Alignment spoofing - tradecraft deception mechanics
Card draw from kills - hero progression system
Logistics simulation - supply lines, fatigue, city control points

# CONTENT & NARRATIVE
## Emotional Set Pieces

Meditative moments - calm interludes between combat
Interior scenes - castle keep, mountain halls, oasis markets
Slice-of-life simulation - attract mode peaceful activities
Necromancer mode - play as antagonist after completing gauntlet

## Thematic Integration

Mirror for princes - educational/philosophical depth
Elementary operations - Dadaist art principles in game mechanics
Berlin 1920s aesthetic - sophisticated urban decadence
Mythic resonance - Antigone, Prospero, classical references

# TECHNICAL DEBT & POLISH
## Architecture Cleanup

ECS migration - more orthogonal component systems
God object refactoring - break down simulator monolith
DSL performance - reduce JavaScript eval bottlenecks
Double buffering - clean separation of read/write phases

## Quality of Life

Deterministic simulation - reproducible results
Save/replay system - analysis and debugging
Hot reload - faster iteration cycles
Error handling - graceful degradation

# STRETCH GOALS
## Advanced Features

Roguelike maps - procedural interior spaces
Strategic layer - world map with cities
AI benchmarking - Sphinx puzzles for language models
Modding support - exposed elementary operations
Multi-year engagement - content that rewards deep play