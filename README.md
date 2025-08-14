# Verdigris

A dark‑mythic 1‑bit auto‑battler with procedural faction generation

## Overview

Verdigris is a tactical RPG where players command tiny lineages of heroes against necromantic foes. Battles unfold on a horizontal scrolling strip while beautiful MacPaint‑style landscapes fill the screen. Behind the chaos lies a deterministic simulation engine and generative pipeline that creates factions, Houses, and cards from simple seeds.

## Features

### 🧬 Generative Pipeline
- **Cardgen**: Procedural creature, ability, and faction generation via Aura DSL
- **Worldgen**: Houses, moieties, and squad creation with cultural coherence  
- **Flav Task Runner**: Dependency-aware orchestration of generation tasks

### ⚔️ Simulation Engine
- **Rules-Based Combat**: Extensible system for abilities, movement, AI behavior
- **Segmented Creatures**: Multi-part entities (dragons, worms) with proper grappling mechanics
- **Physics Simulation**: Knockback, grappling, projectiles, area-of-effect attacks
- **Deterministic**: Identical results in headless tests and browser gameplay

### 🎮 Technical Features
- **Monochrome Aesthetic**: 320×200 resolution, 1-bit color palette
- **Modular Architecture**: Type-safe interfaces, test-driven development  
- **Performance Optimized**: Structure-of-arrays for high unit counts
- **Browser & Headless**: Runs identically in tests and live gameplay

## Core Systems

### Creatures & Combat
- **35+ Unit Types**: From farmers to mechatrons, each with unique abilities
- **Segmented Creatures**: Dragons with head/body/tail sprites, mesoworms with custom segments
- **Grappling Physics**: Mass-based rope mechanics, pinning requires multiple grapplers
- **Perdurance Types**: Sturdiness, swarm behavior, divine regeneration

### Generation Pipeline
```
Color → Body → Rank → Creature → Archetype → Rare → CardSet → YAML → Simulation
```

- **Aura DSL**: Declarative language for content creation
- **Moieties**: 12+ faction types (government, occult, culinary, etc.)
- **Archetypes**: ~300 named characters providing cultural flavor

## Quick Start

```bash
# Install dependencies
bun install

# Run test suite (~500 specs)
bun test

# Launch creature browser
bun src/mwe/creature-browser.html

# Type checking
bun x tsc --noEmit src/freehold.ts
```

## Architecture

- **Rules Engine**: Combat, movement, abilities implemented as composable rules
- **Scene System**: Battle scenarios defined in human-readable `.battle.txt` files  
- **Spatial Queries**: Efficient grid-based collision detection for large battlefields
- **Transform System**: Coordinate space management for multi-screen environments

## Testing

The engine prioritizes testability:
- Unit tests for all core mechanics
- Integration tests for complex interactions  
- Performance benchmarks for optimization
- Determinism validation across platforms

## Development Philosophy

- **Living Documentation**: Code and tests serve as the primary specification
- **Interpretable Mechanics**: Every stat has in-world justification
- **Emergent Depth**: Simple rules create complex interactions
- **Constraints as Creativity**: Technical limits inspire innovative solutions
